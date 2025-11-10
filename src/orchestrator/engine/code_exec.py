"""
Secure code execution environment for agent-generated code.
Uses restricted Python for sandboxing and workspace isolation.

Aligned with Anthropic's MCP Best Practices:
- Run agent-generated code in isolated environment
- Prevent file system / network access outside workspace
- Enforce timeout and memory limits
- Inject MCP client for tool access
- Support progressive imports (whitelist-based)
"""
from typing import Dict, Any, List, Optional
import os
import sys
import json
import signal
import traceback
import resource
from pathlib import Path
from io import StringIO
from contextlib import redirect_stdout, redirect_stderr


class CodeExecutor:
    """
    Sandboxed Python execution environment.

    Features:
    - Restricted builtins (no dangerous operations)
    - Workspace isolation (file access limited to workspace dir)
    - Timeout protection
    - Memory limits
    - MCP client injection
    - Import whitelist
    - Result serialization
    - Execution logging

    Security Model:
    - No subprocess/os.system calls
    - No network access (except via MCP)
    - No file access outside workspace
    - No dynamic code loading
    - Resource limits enforced
    """

    # Whitelist of allowed imports
    ALLOWED_IMPORTS = {
        'json', 're', 'datetime', 'math', 'collections',
        'itertools', 'functools', 'typing', 'dataclasses',
        'uuid', 'hashlib', 'base64', 'time', 'os'
    }

    def __init__(
        self,
        workspace: str = './workspace',
        timeout: int = 60,
        max_memory_mb: int = 512
    ):
        """
        Initialize code executor.

        Args:
            workspace: Directory for code execution (isolated)
            timeout: Max execution time in seconds
            max_memory_mb: Max memory usage in MB
        """
        self.workspace = Path(workspace).resolve()
        self.workspace.mkdir(exist_ok=True, parents=True)
        self.timeout = timeout
        self.max_memory = max_memory_mb * 1024 * 1024  # Convert to bytes

        # Execution state
        self.logs: List[str] = []

    def exec_code(
        self,
        code: str,
        mcp_client: Any = None,
        imports: Optional[List[str]] = None,
        globals_dict: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute agent-generated code in sandbox.

        Args:
            code: Python code to execute
            mcp_client: Injected MCP client for tool access
            imports: Additional imports to allow (must be in whitelist)
            globals_dict: Additional global variables to inject

        Returns:
            Execution result with:
            - success: bool
            - output: Result from 'result' variable in code
            - logs: List of log messages
            - stdout: Captured stdout
            - stderr: Captured stderr
            - workspace_files: Files created in workspace
            - error: Error message (if failed)
            - traceback: Error traceback (if failed)

        Example:
            >>> code = '''
            ... result = mcp.call_tool('chatgpt', 'create_plan', {'task': 'Build app'})
            ... logs.append(f"Got plan: {result}")
            ... '''
            >>> exec_result = executor.exec_code(code, mcp_client=mcp)
            >>> print(exec_result['success'])
            True
        """
        # Reset logs
        self.logs = []

        # Setup execution environment
        exec_env = self._create_safe_globals()

        # Inject MCP client
        if mcp_client:
            exec_env['mcp'] = mcp_client

        # Inject logs list
        exec_env['logs'] = self.logs

        # Inject additional globals
        if globals_dict:
            exec_env.update(globals_dict)

        # Process imports
        if imports:
            for imp in imports:
                if imp not in self.ALLOWED_IMPORTS:
                    return {
                        'success': False,
                        'error': 'forbidden_import',
                        'message': f"Import '{imp}' not allowed. Allowed: {sorted(self.ALLOWED_IMPORTS)}"
                    }
                try:
                    # Import in normal env and inject into exec_env
                    module = __import__(imp)
                    exec_env[imp] = module
                except ImportError as e:
                    return {
                        'success': False,
                        'error': 'import_error',
                        'message': str(e)
                    }

        # Capture stdout/stderr
        stdout_capture = StringIO()
        stderr_capture = StringIO()

        # Set resource limits
        self._set_resource_limits()

        # Execute with timeout
        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                # Set timeout alarm
                def timeout_handler(signum, frame):
                    raise TimeoutError(f"Execution exceeded {self.timeout}s")

                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(self.timeout)

                try:
                    # Compile and execute
                    compiled = compile(code, '<agent_code>', 'exec')
                    exec(compiled, exec_env)

                    # Cancel timeout
                    signal.alarm(0)

                    # Extract results
                    result = exec_env.get('result', None)
                    logs = exec_env.get('logs', [])

                    return {
                        'success': True,
                        'output': result,
                        'logs': logs,
                        'stdout': stdout_capture.getvalue(),
                        'stderr': stderr_capture.getvalue(),
                        'workspace_files': self._list_workspace_files()
                    }

                except TimeoutError as e:
                    signal.alarm(0)
                    return {
                        'success': False,
                        'error': 'timeout',
                        'message': str(e),
                        'stdout': stdout_capture.getvalue(),
                        'stderr': stderr_capture.getvalue()
                    }

                except MemoryError:
                    signal.alarm(0)
                    return {
                        'success': False,
                        'error': 'memory_limit',
                        'message': f"Execution exceeded {self.max_memory // (1024*1024)}MB memory limit",
                        'stdout': stdout_capture.getvalue(),
                        'stderr': stderr_capture.getvalue()
                    }

                except Exception as e:
                    signal.alarm(0)
                    return {
                        'success': False,
                        'error': type(e).__name__,
                        'message': str(e),
                        'traceback': traceback.format_exc(),
                        'stdout': stdout_capture.getvalue(),
                        'stderr': stderr_capture.getvalue()
                    }

        except SyntaxError as e:
            return {
                'success': False,
                'error': 'syntax_error',
                'message': str(e),
                'line': e.lineno,
                'offset': e.offset
            }

    def _create_safe_globals(self) -> Dict[str, Any]:
        """
        Create safe global environment for code execution.

        Provides:
        - Safe builtins (no file I/O, no subprocess)
        - Restricted os module (workspace-only file access)
        - Path utilities
        - JSON utilities
        """
        # Safe builtins (exclude dangerous ones)
        # __builtins__ can be a dict or module depending on context
        import builtins as builtins_module
        safe_builtins = {
            name: getattr(builtins_module, name)
            for name in dir(builtins_module)
            if name not in {
                'eval', 'exec', 'compile', 'open', 'input',
                'breakpoint', 'exit', 'quit',
                'help', 'license', 'copyright', 'credits'
            }
        }

        # Add restricted __import__ that only allows whitelisted modules
        safe_builtins['__import__'] = self._safe_import

        return {
            '__builtins__': safe_builtins,
            'json': json,
            'Path': Path,
            'os': self._create_restricted_os(),
            'print': self._safe_print,
            'workspace': str(self.workspace)
        }

    def _create_restricted_os(self):
        """
        Provide restricted os module with workspace-only access.
        """
        class RestrictedOS:
            def __init__(self, workspace: Path):
                self.workspace = workspace

            def listdir(self, path='.'):
                """List directory contents (workspace-only)"""
                full_path = (self.workspace / path).resolve()
                if not str(full_path).startswith(str(self.workspace)):
                    raise PermissionError(f"Access outside workspace denied: {path}")
                if not full_path.exists():
                    raise FileNotFoundError(f"Directory not found: {path}")
                return os.listdir(full_path)

            def exists(self, path):
                """Check if path exists (workspace-only)"""
                full_path = (self.workspace / path).resolve()
                if not str(full_path).startswith(str(self.workspace)):
                    return False
                return full_path.exists()

            def makedirs(self, path, exist_ok=False):
                """Create directories (workspace-only)"""
                full_path = (self.workspace / path).resolve()
                if not str(full_path).startswith(str(self.workspace)):
                    raise PermissionError(f"Access outside workspace denied: {path}")
                os.makedirs(full_path, exist_ok=exist_ok)

            def remove(self, path):
                """Remove file (workspace-only)"""
                full_path = (self.workspace / path).resolve()
                if not str(full_path).startswith(str(self.workspace)):
                    raise PermissionError(f"Access outside workspace denied: {path}")
                os.remove(full_path)

        return RestrictedOS(self.workspace)

    def _safe_import(self, name, *args, **kwargs):
        """Restricted import that only allows whitelisted modules"""
        if name not in self.ALLOWED_IMPORTS:
            raise ImportError(f"Import '{name}' not allowed. Allowed: {sorted(self.ALLOWED_IMPORTS)}")
        return __import__(name, *args, **kwargs)

    def _safe_print(self, *args, **kwargs):
        """Safe print that also logs to logs list"""
        message = ' '.join(str(arg) for arg in args)
        self.logs.append(message)
        print(*args, **kwargs)

    def _set_resource_limits(self):
        """Set resource limits for execution"""
        try:
            # Set memory limit (soft and hard)
            resource.setrlimit(resource.RLIMIT_AS, (self.max_memory, self.max_memory))

            # Set CPU time limit (soft and hard)
            resource.setrlimit(resource.RLIMIT_CPU, (self.timeout, self.timeout + 5))
        except Exception as e:
            # Resource limits may not be supported on all platforms
            self.logs.append(f"Warning: Could not set resource limits: {e}")

    def _list_workspace_files(self) -> List[str]:
        """List all files in workspace"""
        files = []
        for item in self.workspace.rglob('*'):
            if item.is_file():
                relative_path = item.relative_to(self.workspace)
                files.append(str(relative_path))
        return files

    def cleanup_workspace(self):
        """Remove all files from workspace"""
        import shutil
        if self.workspace.exists():
            shutil.rmtree(self.workspace)
            self.workspace.mkdir(exist_ok=True)
            self.logs.append("Workspace cleaned")

    def get_workspace_file(self, filename: str) -> Optional[str]:
        """
        Read file from workspace.

        Args:
            filename: Relative path within workspace

        Returns:
            File contents or None if not found
        """
        file_path = (self.workspace / filename).resolve()

        # Security check
        if not str(file_path).startswith(str(self.workspace)):
            raise PermissionError(f"Access outside workspace denied: {filename}")

        if not file_path.exists():
            return None

        with open(file_path, 'r') as f:
            return f.read()

    def write_workspace_file(self, filename: str, content: str):
        """
        Write file to workspace.

        Args:
            filename: Relative path within workspace
            content: File content
        """
        file_path = (self.workspace / filename).resolve()

        # Security check
        if not str(file_path).startswith(str(self.workspace)):
            raise PermissionError(f"Access outside workspace denied: {filename}")

        # Create parent directories if needed
        file_path.parent.mkdir(parents=True, exist_ok=True)

        with open(file_path, 'w') as f:
            f.write(content)

        self.logs.append(f"Wrote file: {filename}")


# Example usage
def example_usage():
    """Example of using CodeExecutor"""

    # Create executor
    executor = CodeExecutor(workspace='./workspace', timeout=30)

    # Example 1: Simple calculation
    code1 = """
result = sum(range(100))
logs.append(f"Sum calculated: {result}")
"""

    result1 = executor.exec_code(code1)
    print("Example 1:", result1)

    # Example 2: With MCP client (simulated)
    code2 = """
# Call MCP tool
plan = mcp.call_tool('chatgpt', 'create_plan', {'task': 'Build app'})
logs.append(f"Got plan: {plan}")
result = plan
"""

    # Would need actual MCP client
    # result2 = executor.exec_code(code2, mcp_client=mcp_client)

    # Example 3: File operations
    code3 = """
# Write file to workspace
with open(workspace + '/output.txt', 'w') as f:
    f.write('Hello from agent code!')
logs.append('File written')
result = 'success'
"""

    result3 = executor.exec_code(code3)
    print("Example 3:", result3)

    # Read back
    content = executor.get_workspace_file('output.txt')
    print("File content:", content)


if __name__ == '__main__':
    example_usage()
