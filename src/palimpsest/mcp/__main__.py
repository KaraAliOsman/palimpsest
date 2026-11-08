"""``python -m palimpsest.mcp`` - run the Palimpsest MCP server over stdio."""
import sys

try:
    from .server import main
except ImportError as exc:  # the SDK is an optional extra
    if "mcp" in str(exc):
        sys.exit("The MCP SDK is not installed. Run:  pip install -e \".[mcp]\"   (or: pip install mcp)")
    raise

if __name__ == "__main__":
    main()
