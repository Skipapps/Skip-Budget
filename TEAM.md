# SkipBudget team cheat sheet

You are the Founder. Claude in the main chat is the CEO. Everyone else is a named subagent defined in `.claude/agents/`.

## Who is who

| Team | Lead | Members |
|---|---|---|
| Development (D) | **Dmitri** | Dana (UI), Diego (data), Drew (money maths), Dilip (native, builds, purchases) |
| Product design (P) | **Priya** | Pia (everyday screens), Paulo (loans, insights, paywall) |
| Testing (T) | **Tara** | Theo (automated tests), Tia (simulator and manual) |
| Marketing (M) | **Marcus** | Mia (copy), Max (growth and research) |

## How to talk to them

Say it to the CEO in chat, naming the person:

- "Ask Dmitri to plan the recurring-transactions feature."
- "Tell Tia to retest the paywall in dark mode."
- "What did Drew report on the loan schedule?"
- "Show me Marcus's launch plan."

The CEO forwards your message to that agent and relays the reply word for word. Running agents also show up in the app's tasks panel.

## Where their work lands

- Team logs (long-term memory): `.claude/team/logs/`
- Design specs: `.claude/team/design/`
- Marketing drafts: `.claude/team/marketing/`
- Code: on branches and worktrees, merged only after you approve

## What only you can approve

Specs, designs, merges to main, any published copy, any spend or account change. The CEO will stop and ask at each of these.

Full rules: `.claude/team/CHARTER.md`
