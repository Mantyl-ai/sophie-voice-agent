# Sales Intelligence MCP Server

Gives Claude direct access to your sales tools — Gong, ZoomInfo, Clay, and LinkedIn Sales Navigator — so you can research prospects, pull call transcripts, and enrich leads without leaving the conversation.

16 tools. One server. Works with Claude Desktop.

## Quick Start

```bash
# One-command install
bash install.sh
```

The script installs the server, finds your Claude Desktop config, prompts for API keys, and wires everything up. Restart Claude Desktop and you're live.

### Manual Setup

```bash
# 1. Install and build
npm install && npm run build

# 2. Add to your Claude Desktop config
#    Mac:     ~/Library/Application Support/Claude/claude_desktop_config.json
#    Linux:   ~/.config/Claude/claude_desktop_config.json
#    Windows: %APPDATA%\Claude\claude_desktop_config.json
```

Add this to your `mcpServers` section:

```json
{
  "sales-intelligence": {
    "command": "node",
    "args": ["/path/to/dist/index.js"],
    "env": {
      "GONG_ACCESS_KEY": "your-key",
      "GONG_ACCESS_KEY_SECRET": "your-secret",
      "ZOOMINFO_CLIENT_ID": "your-id",
      "ZOOMINFO_PRIVATE_KEY": "your-key",
      "CLAY_API_KEY": "your-key",
      "LINKEDIN_ACCESS_TOKEN": "your-token"
    }
  }
}
```

Restart Claude Desktop. Only configure the platforms you use — unused ones are skipped gracefully.

## 16 Tools

### Gong (5 tools)
| Tool | What It Does |
|---|---|
| `search_calls` | Find calls by keyword, date, or deal |
| `get_transcript` | Pull full call transcript |
| `get_call_details` | Call metadata, participants, duration |
| `search_calls_by_participant` | Find all calls with a specific person |
| `get_call_stats` | Talk ratio, longest monologue, questions asked |

### ZoomInfo (4 tools)
| Tool | What It Does |
|---|---|
| `search_company` | Firmographic data, revenue, headcount |
| `search_contact` | Find contacts by title, company, location |
| `get_org_chart` | Reporting structure and hierarchy |
| `get_tech_stack` | Technologies a company uses |

### Clay (3 tools)
| Tool | What It Does |
|---|---|
| `enrich_person` | Full contact enrichment from email or LinkedIn |
| `enrich_company` | Company enrichment from domain |
| `trigger_enrichment` | Kick off a Clay enrichment workflow |

### LinkedIn Sales Navigator (3 tools)
| Tool | What It Does |
|---|---|
| `search_leads` | Advanced lead search with filters |
| `get_profile` | Full profile data for a prospect |
| `search_companies` | Company search with firmographic filters |

### Utility (1 tool)
| Tool | What It Does |
|---|---|
| `sales_intel_status` | Check which platforms are connected and healthy |

## Usage Examples

Once installed, just talk to Claude naturally:

**Prospect Research**
> "What do we know about Acme Corp? Pull their tech stack and find the VP of Sales."

**Call Review**
> "Find my last 3 calls with Acme Corp and summarize the key objections."

**Lead Enrichment**
> "Enrich sarah.chen@acme.com and find her reporting chain."

**Pipeline Prep**
> "For my calls tomorrow, pull company info and recent call history for each account."

## Where to Get API Keys

| Platform | Where |
|---|---|
| Gong | Settings > Integrations > API |
| ZoomInfo | Developer Portal > Create App |
| Clay | Settings > API |
| LinkedIn | Developer Portal > OAuth 2.0 token |

## Troubleshooting

| Problem | Fix |
|---|---|
| Module not found | Run `npm install && npm run build` again |
| Server not showing in Claude | Verify `dist/index.js` path in config |
| LinkedIn 401 errors | Regenerate token from Developer Portal |
| Missing tools for a platform | Add that platform's API keys to config |
| Config file not found | Check path with `ls ~/Library/Application\ Support/Claude/` (Mac) |

## Tech Stack

TypeScript (86.8%), Shell (8.3%), JavaScript (4.9%)

Built with the Model Context Protocol (MCP) SDK.

## License

MIT — see [LICENSE](LICENSE).
