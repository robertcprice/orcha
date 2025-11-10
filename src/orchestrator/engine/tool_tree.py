"""
Tool Tree Generator for filesystem-based tool discovery.
Generates Python modules from MCP server tool definitions.

Aligned with Anthropic's MCP Best Practices:
- Filesystem-based tool discovery
- Progressive disclosure (explore before loading)
- On-demand tool definition loading
- Reduces context window bloat
"""
from typing import Dict, Any, List
from pathlib import Path
import json
import re


class ToolTreeGenerator:
    """
    Creates filesystem representation of MCP tools.

    Generates structure like:
    ```
    ./mcp_servers/
      ├── claude/
      │   ├── orchestrate.py
      │   ├── review_code.py
      │   ├── finalize_plan.py
      │   └── __index__.json
      ├── chatgpt/
      │   ├── create_plan.py
      │   ├── evaluate_confidence.py
      │   └── __index__.json
      ├── codex/
      │   └── ...
      └── README.md
    ```

    This allows agents to:
    1. Explore tools via filesystem operations (os.listdir)
    2. Load only needed tool definitions
    3. Progressive disclosure (name → desc → full schema)
    """

    def __init__(self, output_dir: str = './mcp_servers'):
        """
        Initialize tool tree generator.

        Args:
            output_dir: Root directory for MCP server tool tree
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True, parents=True)

    def generate_tree(self, mcp_client: Any):
        """
        Generate complete tool tree from MCP client.

        Args:
            mcp_client: Connected MCP client with servers
        """
        print(f"Generating MCP tool tree in {self.output_dir}...")

        # Get all connected servers
        servers = mcp_client.servers

        # Generate directory for each server
        for server_name, server_config in servers.items():
            print(f"  Processing server: {server_name}")
            self._generate_server_tree(mcp_client, server_name, server_config)

        # Generate root README
        self._generate_root_readme(servers)

        print(f"✓ Tool tree generated successfully ({len(servers)} servers)")

    def _generate_server_tree(
        self,
        mcp_client: Any,
        server_name: str,
        server_config: Any
    ):
        """Generate tool tree for a single server"""
        server_dir = self.output_dir / server_name
        server_dir.mkdir(exist_ok=True)

        # Get tool registry for this server
        # In production, this would query the actual MCP server
        # For now, use the simulated registry from mcp_client
        tool_registry = mcp_client._get_tool_registry().get(server_name, [])

        tool_index = []

        # Generate file for each tool
        for tool_spec in tool_registry:
            tool_name = tool_spec['name']
            self._generate_tool_file(server_dir, server_name, tool_name, tool_spec)

            # Add to index
            tool_index.append({
                'name': tool_name,
                'description': tool_spec.get('description', ''),
                'file': f'{tool_name}.py',
                'parameters': list(tool_spec.get('parameters', {}).keys())
            })

        # Generate __index__.json
        with open(server_dir / '__index__.json', 'w') as f:
            json.dump({
                'server': server_name,
                'provider': server_config.provider,
                'tool_count': len(tool_index),
                'tools': tool_index
            }, f, indent=2)

        # Generate __init__.py for easy imports
        self._generate_server_init(server_dir, tool_index)

    def _generate_tool_file(
        self,
        server_dir: Path,
        server_name: str,
        tool_name: str,
        tool_spec: Dict[str, Any]
    ):
        """
        Generate individual tool Python file.

        Creates a Python module with:
        - Tool function
        - Parameter documentation
        - Schema definition
        - Usage examples
        """
        # Format function name (ensure valid Python identifier)
        func_name = self._make_valid_identifier(tool_name)

        # Generate parameter signature
        params = tool_spec.get('parameters', {})
        param_signature = self._generate_param_signature(params)

        # Generate docstring
        docstring = self._generate_docstring(tool_spec)

        # Generate template
        template = f'''"""
{tool_spec.get('description', 'No description available')}

Server: {server_name}
Tool: {tool_name}
"""
from typing import Dict, Any


def {func_name}(mcp_client, {param_signature}) -> Dict[str, Any]:
    """
{docstring}
    """
    params = {{
{self._generate_param_dict(params)}
    }}

    return mcp_client.call_tool('{server_name}', '{tool_name}', params)


# Tool Metadata
TOOL_NAME = '{tool_name}'
SERVER = '{server_name}'

# Parameter Schema
PARAMETERS = {json.dumps(params, indent=4)}

# Return Schema
RETURNS = {json.dumps(tool_spec.get('returns', {}), indent=4)}

# Usage Examples
EXAMPLES = {json.dumps(tool_spec.get('examples', []), indent=4)}


# Convenience function for direct use
def execute(mcp_client, **kwargs):
    """Execute tool with keyword arguments"""
    return {func_name}(mcp_client, **kwargs)
'''

        # Write tool file
        with open(server_dir / f'{tool_name}.py', 'w') as f:
            f.write(template)

    def _generate_server_init(self, server_dir: Path, tool_index: List[Dict]):
        """Generate __init__.py for server module"""
        imports = []
        for tool in tool_index:
            tool_name = tool['name']
            func_name = self._make_valid_identifier(tool_name)
            imports.append(f"from .{tool_name} import {func_name}")

        init_content = f'''"""
MCP Server Tools
Auto-generated by ToolTreeGenerator

Tools: {len(tool_index)}
"""

# Import all tools
{chr(10).join(imports)}

__all__ = [
{chr(10).join(f'    "{self._make_valid_identifier(t["name"])}",' for t in tool_index)}
]
'''

        with open(server_dir / '__init__.py', 'w') as f:
            f.write(init_content)

    def _make_valid_identifier(self, name: str) -> str:
        """Convert tool name to valid Python identifier"""
        # Replace non-alphanumeric with underscore
        identifier = re.sub(r'[^a-zA-Z0-9_]', '_', name)

        # Ensure doesn't start with digit
        if identifier[0].isdigit():
            identifier = f'tool_{identifier}'

        return identifier

    def _generate_param_signature(self, params: Dict[str, Any]) -> str:
        """Generate function parameter signature"""
        if not params:
            return '**kwargs'

        sig_parts = []
        for param_name, param_spec in params.items():
            if isinstance(param_spec, dict):
                param_type = param_spec.get('type', 'Any')
                required = param_spec.get('required', False)
            else:
                param_type = param_spec
                required = False

            if required:
                sig_parts.append(f'{param_name}: {param_type}')
            else:
                sig_parts.append(f'{param_name}: {param_type} = None')

        sig_parts.append('**kwargs')
        return ', '.join(sig_parts)

    def _generate_param_dict(self, params: Dict[str, Any]) -> str:
        """Generate parameter dictionary for MCP call"""
        lines = []
        for param_name in params.keys():
            lines.append(f"        '{param_name}': {param_name},")

        if lines:
            lines.append("        **kwargs")

        return '\n'.join(lines)

    def _generate_docstring(self, tool_spec: Dict[str, Any]) -> str:
        """Generate comprehensive docstring"""
        lines = []

        # Description
        desc = tool_spec.get('description', 'No description available')
        lines.append(f"    {desc}")
        lines.append("")

        # Parameters
        params = tool_spec.get('parameters', {})
        if params:
            lines.append("    Args:")
            for param_name, param_spec in params.items():
                if isinstance(param_spec, dict):
                    param_type = param_spec.get('type', 'Any')
                    param_desc = param_spec.get('description', '')
                    lines.append(f"        {param_name} ({param_type}): {param_desc}")
                else:
                    lines.append(f"        {param_name}: Parameter")
            lines.append("")

        # Returns
        returns = tool_spec.get('returns', {})
        if returns:
            return_type = returns.get('type', 'dict')
            return_desc = returns.get('description', 'Tool execution result')
            lines.append("    Returns:")
            lines.append(f"        {return_type}: {return_desc}")
            lines.append("")

        # Examples
        examples = tool_spec.get('examples', [])
        if examples:
            lines.append("    Examples:")
            for example in examples[:2]:  # Show max 2 examples
                lines.append(f"        >>> {example}")
            lines.append("")

        return '\n'.join(lines)

    def _generate_root_readme(self, servers: Dict[str, Any]):
        """Generate root README for tool tree"""
        server_list = '\n'.join(
            f'- **{name}** ({config.provider}) - {len(config.capabilities)} capabilities'
            for name, config in servers.items()
        )

        readme = f'''# MCP Tool Tree

Auto-generated tool definitions from MCP servers.

## Connected Servers

{server_list}

## Structure

Each server has its own directory containing:
- **Individual tool files** (.py) - One file per tool with function, schema, and examples
- **__index__.json** - Tool catalog with metadata
- **__init__.py** - Python module initialization

## Usage in Agent Code

### Method 1: Direct Import
```python
from mcp_servers.claude.orchestrate import orchestrate
from mcp_servers.chatgpt.create_plan import create_plan

# Use with MCP client
result = orchestrate(mcp_client, task='Build calculator')
plan = create_plan(mcp_client, task='Implement auth', constraints={{}})
```

### Method 2: Dynamic Discovery
```python
import os
import json

# Discover available servers
servers = os.listdir('./mcp_servers')
print(f"Available servers: {{servers}}")

# Explore tools in a server
with open('./mcp_servers/claude/__index__.json') as f:
    index = json.load(f)
    print(f"Claude tools: {{[t['name'] for t in index['tools']]}}")

# Load tool dynamically
from importlib import import_module
tool_module = import_module('mcp_servers.claude.orchestrate')
result = tool_module.execute(mcp_client, task='Build app')
```

### Method 3: MCP Client Search
```python
# Search for tools without loading
tools = mcp_client.search_tools('planning', detail_level='name-desc')
print(f"Found {{len(tools)}} planning tools")

# Load only what you need
if tools:
    result = mcp_client.call_tool(
        tools[0]['server'],
        tools[0]['name'],
        {{'task': 'Build app'}}
    )
```

## Progressive Disclosure

Agents can explore tools at different detail levels:

1. **Names only** - Minimal token usage
   ```python
   mcp_client.search_tools('security', detail_level='name')
   # Returns: [{{'server': 'claude', 'name': 'review_code'}}]
   ```

2. **Names + Descriptions** - Moderate token usage
   ```python
   mcp_client.search_tools('security', detail_level='name-desc')
   # Returns: [{{'server': 'claude', 'name': 'review_code',
   #            'description': 'Review code for quality and security'}}]
   ```

3. **Full Schema** - Complete information
   ```python
   mcp_client.search_tools('security', detail_level='full-schema')
   # Returns: Full parameter and return schemas
   ```

## Regeneration

This tree is auto-generated. To regenerate:

```bash
python -m orchestrator.engine.tool_tree
```

Or in code:

```python
from orchestrator.engine.mcp_client import create_default_mcp_client
from orchestrator.engine.tool_tree import ToolTreeGenerator

mcp_client = create_default_mcp_client()
generator = ToolTreeGenerator('./mcp_servers')
generator.generate_tree(mcp_client)
```

## Benefits

1. **Token Efficiency** - Load only needed tool definitions
2. **Filesystem Exploration** - Use standard os.listdir() instead of API calls
3. **IDE Support** - Full autocomplete and type hints
4. **Documentation** - Every tool has docstrings and examples
5. **Versioning** - Git-trackable tool definitions

## Architecture

This implements Anthropic's MCP best practice of filesystem-based tool discovery,
reducing context window consumption by 90-98% compared to loading all tool definitions upfront.

Generated: {Path.cwd()}
'''

        with open(self.output_dir / 'README.md', 'w') as f:
            f.write(readme)

    def clean_tree(self):
        """Remove all generated files"""
        import shutil
        if self.output_dir.exists():
            shutil.rmtree(self.output_dir)
            print(f"✓ Cleaned tool tree: {self.output_dir}")


# CLI interface
def main():
    """Generate tool tree from command line"""
    from orchestrator.engine.mcp_client import create_default_mcp_client

    print("MCP Tool Tree Generator")
    print("=" * 50)

    # Create MCP client
    mcp_client = create_default_mcp_client()

    # Generate tool tree
    generator = ToolTreeGenerator()
    generator.generate_tree(mcp_client)

    print("\n✓ Tool tree generation complete!")
    print(f"  Location: {generator.output_dir}")
    print(f"  Servers: {len(mcp_client.servers)}")
    print("\nYou can now import tools from the generated modules.")


if __name__ == '__main__':
    main()
