/**
 * Lightweight Pi visual polish.
 *
 * No package dependencies: replaces the default footer with a fixed
 * Nerd-Font status bar and adds a small colored working indicator.
 */

import type { ExtensionAPI, ExtensionContext, Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { homedir } from "node:os";
import { relative } from "node:path";

type ThinkingLevel = "off" | "minimal" | "low" | "medium" | "high" | "xhigh";

type Segment = {
	icon: string;
	text: string;
	iconColor: ThemeColor;
	textColor?: ThemeColor;
	rawText?: boolean;
};

const HOME = homedir();
const SEPARATOR = " │ ";

const THINKING_COLORS: Record<ThinkingLevel, ThemeColor> = {
	off: "thinkingOff",
	minimal: "thinkingMinimal",
	low: "thinkingLow",
	medium: "thinkingMedium",
	high: "thinkingHigh",
	xhigh: "thinkingXhigh",
};

function formatCount(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10_000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
	if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
	return `${Math.round(count / 1_000_000)}M`;
}

function formatCost(cost: number): string {
	if (cost <= 0) return "";
	if (cost < 0.01) return `$${cost.toFixed(4)}`;
	return `$${cost.toFixed(2)}`;
}

function displayCwd(cwd: string): string {
	if (cwd === HOME) return "~";
	if (cwd.startsWith(`${HOME}/`)) return `~/${relative(HOME, cwd)}`;
	return cwd;
}

function tokenSummary(ctx: ExtensionContext): string | undefined {
	let input = 0;
	let output = 0;
	let cost = 0;

	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message") continue;
		const message = entry.message as { role?: string; usage?: { input?: number; output?: number; cost?: { total?: number } } };
		if (message.role !== "assistant" || !message.usage) continue;
		input += message.usage.input ?? 0;
		output += message.usage.output ?? 0;
		cost += message.usage.cost?.total ?? 0;
	}

	if (input === 0 && output === 0) return undefined;
	return [`↑${formatCount(input)}`, `↓${formatCount(output)}`, formatCost(cost)].filter(Boolean).join(" ");
}

function progressBar(percent: number, width = 5): string {
	const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)));
	return "▰".repeat(filled) + "▱".repeat(width - filled);
}

function contextSegment(ctx: ExtensionContext): Segment | undefined {
	const usage = ctx.getContextUsage();
	if (!usage || !usage.contextWindow) return undefined;

	const percent = Math.max(0, Math.min(100, Math.round((usage.tokens / usage.contextWindow) * 100)));
	const color: ThemeColor = percent >= 80 ? "error" : percent >= 60 ? "warning" : "borderAccent";
	return {
		icon: "󰅟",
		text: `${progressBar(percent)} ${percent}%`,
		iconColor: color,
		textColor: color,
	};
}

function extensionStatusSegment(theme: Theme, statuses: ReadonlyMap<string, string>): Segment | undefined {
	const values = Array.from(statuses.values()).filter((value) => value.trim().length > 0);
	if (values.length === 0) return undefined;
	return {
		icon: "󰄬",
		text: values.join(theme.fg("dim", " · ")),
		iconColor: "mdListBullet",
		rawText: true,
	};
}

function renderSegment(theme: Theme, segment: Segment): string {
	const icon = theme.fg(segment.iconColor, segment.icon);
	const text = segment.rawText ? segment.text : theme.fg(segment.textColor ?? "muted", segment.text);
	return `${icon} ${text}`;
}

function joinSegments(theme: Theme, segments: Segment[]): string {
	return segments.map((segment) => renderSegment(theme, segment)).join(theme.fg("borderMuted", SEPARATOR));
}

function fitFooter(left: string, right: string, width: number): string {
	if (width <= 0) return "";

	let leftText = left;
	let rightText = right;
	let leftWidth = visibleWidth(leftText);
	let rightWidth = visibleWidth(rightText);
	const minPad = 1;

	if (leftWidth + rightWidth + minPad > width) {
		const rightBudget = Math.max(0, Math.min(rightWidth, Math.floor(width * 0.42)));
		rightText = truncateToWidth(rightText, rightBudget, "…");
		rightWidth = visibleWidth(rightText);
	}

	if (leftWidth + rightWidth + minPad > width) {
		const leftBudget = Math.max(0, width - rightWidth - minPad);
		leftText = truncateToWidth(leftText, leftBudget, "…");
		leftWidth = visibleWidth(leftText);
	}

	if (leftWidth + rightWidth + minPad > width) {
		return truncateToWidth(`${leftText} ${rightText}`, width, "…");
	}

	const padding = " ".repeat(Math.max(minPad, width - leftWidth - rightWidth));
	return truncateToWidth(`${leftText}${padding}${rightText}`, width, "");
}

function thinkingLevel(pi: ExtensionAPI): ThinkingLevel {
	const level = pi.getThinkingLevel();
	return level === "off" || level === "minimal" || level === "low" || level === "medium" || level === "high"
		? level
		: "xhigh";
}

function installFooter(pi: ExtensionAPI, ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;

	ctx.ui.setFooter((tui, theme, footerData) => {
		const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

		return {
			dispose: unsubscribe,
			invalidate(): void {},
			render(width: number): string[] {
				const left: Segment[] = [
					{ icon: "", text: displayCwd(ctx.cwd), iconColor: "accent", textColor: "text" },
				];

				const branch = footerData.getGitBranch();
				if (branch) left.push({ icon: "", text: branch, iconColor: "mdListBullet" });

				const sessionName = pi.getSessionName();
				if (sessionName) left.push({ icon: "󰆼", text: sessionName, iconColor: "mdHeading" });

				const tokens = tokenSummary(ctx);
				if (tokens) left.push({ icon: "󰊢", text: tokens, iconColor: "success" });

				const context = contextSegment(ctx);
				if (context) left.push(context);

				const status = extensionStatusSegment(theme, footerData.getExtensionStatuses());
				if (status) left.push(status);

				const level = thinkingLevel(pi);
				const model = ctx.model;
				const right: Segment[] = [];
				if (model?.provider) right.push({ icon: "󱚣", text: model.provider, iconColor: "warning" });
				if (model?.id) right.push({ icon: "󰚩", text: model.id, iconColor: "accent", textColor: "text" });
				right.push({ icon: "󰓅", text: level, iconColor: THINKING_COLORS[level] });

				return [fitFooter(joinSegments(theme, left), joinSegments(theme, right), width)];
			},
		};
	});
}

function installWorkingIndicator(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;
	const theme = ctx.ui.theme;
	ctx.ui.setWorkingIndicator({
		frames: [
			theme.fg("dim", "·"),
			theme.fg("muted", "•"),
			theme.fg("accent", "●"),
			theme.fg("borderAccent", "●"),
			theme.fg("mdListBullet", "●"),
			theme.fg("muted", "•"),
		],
		intervalMs: 110,
	});
}

export default function piPretty(pi: ExtensionAPI): void {
	pi.on("session_start", async (_event, ctx) => {
		installWorkingIndicator(ctx);
		installFooter(pi, ctx);
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (!ctx.hasUI) return;
		ctx.ui.setFooter(undefined);
		ctx.ui.setWorkingIndicator();
	});
}
