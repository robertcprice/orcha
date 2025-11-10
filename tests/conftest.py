"""Pytest configuration helpers for the repository.

This project contains a number of asynchronous test functions that are written
as ``async def`` coroutines without using ``pytest``'s asyncio plugin.  When
pytest encounters such tests it fails collection with a helpful message about
installing an asyncio plugin.  Rather than pulling in an additional dependency
for the test environment, we provide a small hook that knows how to execute
coroutine tests by driving them with an event loop.

The hook integrates with pytest's normal call flow: whenever a collected test
function is a coroutine function we run it inside a freshly created event loop
via ``asyncio.run``.  Synchronous tests are left untouched.
"""

from __future__ import annotations

import asyncio
import inspect
from typing import Any

import pytest


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool | None:
    """Execute ``async def`` tests without requiring external plugins.

    When pytest collects a coroutine test it normally raises an informative
    error unless a third-party asyncio plugin is installed.  We intercept that
    moment and run the coroutine ourselves so that the existing asynchronous
    tests keep working in lightweight environments such as this kata.

    Returning ``True`` tells pytest that the call has been handled.  For
    regular synchronous tests we return ``None`` so pytest can execute them
    using its default machinery.
    """

    function: Any = pyfuncitem.obj
    if not inspect.iscoroutinefunction(function):
        return None

    signature = inspect.signature(function)
    call_kwargs = {
        name: pyfuncitem.funcargs[name]
        for name in signature.parameters
    }

    coro = function(**call_kwargs)
    asyncio.run(coro)
    return True
