from .interface import term as _term
import sys


def term():
    '''console entry point (astlo = astlo.main:term). the library raises ValueError instead of calling sys.exit, so the cli prints the message here instead of a traceback'''
    try:
        _term()
    except ValueError as e:
        from rich.console import Console
        Console().print(f'[bold red]{e}[/bold red]')
        sys.exit(1)


if __name__ == '__main__':
    term()
