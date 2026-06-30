/**
 * Destructive Command Guard
 *
 * Prompts for confirmation before the agent runs dangerous bash commands.
 * Add or remove patterns from `dangerousPatterns` to taste.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const dangerousPatterns: { name: string; re: RegExp }[] = [
	{ name: "rm -rf",        re: /\brm\s+(-\w*r\w*f|-r\w*f|-f\w*r)\b/i },
	{ name: "sudo",          re: /\bsudo\b/i },
	{ name: "chmod/chown 777", re: /\b(chmod|chown)\b.*\b777\b/i },
	{ name: "git push --force", re: /\bgit\s+push\b.*(\bf\b|\b--force\b|\b--force-with-lease\b)/i },
	{ name: "dd if=",        re: /\bdd\b.*\bif=/i },
	{ name: "mkfs",          re: /\bmkfs(\.\w+)?\b/i },
	{ name: "fork bomb",     re: /:\(\)\s*\{.*:\|:.*&.*\};:/ },
];

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") return undefined;

		const command = event.input.command as string;
		const hit = dangerousPatterns.find((p) => p.re.test(command));
		if (!hit) return undefined;

		if (!ctx.hasUI) {
			return { block: true, reason: `Blocked destructive command (${hit.name}) — no UI for confirmation` };
		}

		const ok = await ctx.ui.confirm(
			`⚠️  Destructive command (${hit.name})`,
			`${command}\n\nAllow?`,
		);

		return ok ? undefined : { block: true, reason: `Blocked by user (${hit.name})` };
	});
}
