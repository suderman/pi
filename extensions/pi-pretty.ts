/**
 * Lightweight Pi visual polish.
 *
 * No package dependencies: replaces the default footer with a fixed
 * Nerd-Font status bar and adds a small colored working indicator.
 */

import type {
	ExtensionAPI,
	ExtensionContext,
	Theme,
	ThemeColor,
} from "@earendil-works/pi-coding-agent";
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

function displayCwd(cwd: string): string {
	if (cwd === HOME) return "~";
	if (cwd.startsWith(`${HOME}/`)) return `~/${relative(HOME, cwd)}`;
	return cwd;
}

function contextSegment(ctx: ExtensionContext): Segment | undefined {
	const usage = ctx.getContextUsage();
	if (!usage || !usage.contextWindow) return undefined;

	// Pi-DCP's /dcp:context reads this same post-pruning source of truth.
	const tokens = usage.tokens;
	const percent = usage.percent;
	const color: ThemeColor =
		percent !== null && percent >= 80
			? "error"
			: percent !== null && percent >= 60
				? "warning"
				: "borderAccent";
	return {
		icon: "🧠",
		text:
			tokens === null || percent === null
				? `?/${formatCount(usage.contextWindow)} ?%`
				: `${formatCount(tokens)}/${formatCount(usage.contextWindow)} ${Math.round(percent)}%`,
		iconColor: color,
		textColor: color,
	};
}

function extensionStatusSegment(
	theme: Theme,
	statuses: ReadonlyMap<string, string>,
): Segment | undefined {
	const values = Array.from(statuses.values()).filter(
		(value) => value.trim().length > 0,
	);
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
	const text = segment.rawText
		? segment.text
		: theme.fg(segment.textColor ?? "muted", segment.text);
	return `${icon} ${text}`;
}

function joinSegments(theme: Theme, segments: Segment[]): string {
	return segments
		.map((segment) => renderSegment(theme, segment))
		.join(theme.fg("borderMuted", SEPARATOR));
}

function fitFooter(left: string, right: string, width: number): string {
	if (width <= 0) return "";

	let leftText = left;
	let rightText = right;
	let leftWidth = visibleWidth(leftText);
	let rightWidth = visibleWidth(rightText);
	const minPad = 1;

	if (leftWidth + rightWidth + minPad > width) {
		const rightBudget = Math.max(
			0,
			Math.min(rightWidth, Math.floor(width * 0.42)),
		);
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
	return level === "off" ||
		level === "minimal" ||
		level === "low" ||
		level === "medium" ||
		level === "high"
		? level
		: "xhigh";
}

let requestFooterRender: (() => void) | undefined;

function installFooter(pi: ExtensionAPI, ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;

	ctx.ui.setFooter((tui, theme, footerData) => {
		const requestRender = () => tui.requestRender();
		requestFooterRender = requestRender;
		const unsubscribe = footerData.onBranchChange(requestRender);

		return {
			dispose(): void {
				unsubscribe();
				if (requestFooterRender === requestRender) requestFooterRender = undefined;
			},
			invalidate(): void {},
			render(width: number): string[] {
				const left: Segment[] = [
					{
						icon: "",
						text: displayCwd(ctx.cwd),
						iconColor: "accent",
						textColor: "text",
					},
				];

				const branch = footerData.getGitBranch();
				if (branch)
					left.push({ icon: "", text: branch, iconColor: "mdListBullet" });

				const sessionName = pi.getSessionName();
				if (sessionName)
					left.push({ icon: "󰆼", text: sessionName, iconColor: "mdHeading" });

				const context = contextSegment(ctx);
				if (context) left.push(context);

				const status = extensionStatusSegment(
					theme,
					footerData.getExtensionStatuses(),
				);
				if (status) left.push(status);

				const level = thinkingLevel(pi);
				const model = ctx.model;
				const right: Segment[] = [];
				if (model?.provider)
					right.push({ icon: "󱚣", text: model.provider, iconColor: "warning" });
				if (model?.id)
					right.push({
						icon: "󰚩",
						text: model.id,
						iconColor: "accent",
						textColor: "text",
					});
				right.push({ icon: "󰓅", text: level, iconColor: THINKING_COLORS[level] });

				return [
					fitFooter(joinSegments(theme, left), joinSegments(theme, right), width),
				];
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

	pi.on("context", async () => requestFooterRender?.());
	pi.on("turn_end", async () => requestFooterRender?.());
	pi.on("session_compact", async () => requestFooterRender?.());

	pi.on("session_shutdown", async (_event, ctx) => {
		requestFooterRender = undefined;
		if (!ctx.hasUI) return;
		ctx.ui.setFooter(undefined);
		ctx.ui.setWorkingIndicator();
	});
}
