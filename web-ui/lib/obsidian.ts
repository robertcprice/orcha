/**
 * Obsidian Vault Integration Library
 *
 * Provides utilities to read and parse Obsidian vault content
 * for display in the UI agent console.
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const VAULT_ROOT = path.join(process.cwd(), '..', 'obsidian-vault');

export interface FrontMatter {
	type?: string;
	date?: string;
	time?: string;
	status?: string;
	tags?: string[];
	related_components?: string[];
	related_experiments?: string[];
	component?: string;
	hypothesis?: string;
	version?: string;
	[key: string]: any;
}

export interface ObsidianNote {
	id: string;
	title: string;
	content: string;
	frontmatter: FrontMatter;
	path: string;
	created: Date;
	modified: Date;
}

export interface Session extends ObsidianNote {
	goals: string[];
	discoveries: string[];
	implementations: string[];
	fixes: string[];
	optimizations: string[];
	filesModified: string[];
}

export interface Experiment extends ObsidianNote {
	component: string;
	hypothesis: string;
	results?: any;
	recommendation?: string;
}

export interface Milestone extends ObsidianNote {
	achievements: string[];
	metrics: Record<string, any>;
	breakthroughs: string[];
}

/**
 * Read all notes from a specific directory
 */
export async function readNotesFromDir(dirPath: string): Promise<ObsidianNote[]> {

	const fullPath = path.join(VAULT_ROOT, dirPath);

	if (!fs.existsSync(fullPath)) {

		return [];
	}

	const files = fs.readdirSync(fullPath)
		.filter(f => f.endsWith('.md') && !f.includes('template'));

	const notes: ObsidianNote[] = [];

	for (const file of files) {

		const filePath = path.join(fullPath, file);
		const stats = fs.statSync(filePath);
		const content = fs.readFileSync(filePath, 'utf-8');

		const { data: frontmatter, content: markdownContent } = matter(content);

		// Extract title from first heading or filename
		const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
		const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

		notes.push({
			id: file.replace('.md', ''),
			title,
			content: markdownContent,
			frontmatter: frontmatter as FrontMatter,
			path: path.relative(VAULT_ROOT, filePath),
			created: stats.birthtime,
			modified: stats.mtime,
		});
	}

	return notes.sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

/**
 * Get all agent sessions
 */
export async function getSessions(limit?: number): Promise<Session[]> {

	const notes = await readNotesFromDir('05-Agent-Sessions');

	const sessions = notes.map(note => {

		// Parse session-specific content
		const goals = extractList(note.content, '## Goals');
		const discoveries = extractList(note.content, '### Discovery Phase');
		const implementations = extractList(note.content, '### Implementation Phase');
		const fixes = extractList(note.content, '## Issues Encountered');
		const optimizations = extractList(note.content, '### Optimizations Discovered');
		const filesModified = extractList(note.content, '**Files Modified**:');

		return {
			...note,
			goals,
			discoveries,
			implementations,
			fixes,
			optimizations,
			filesModified,
		} as Session;
	});

	return limit ? sessions.slice(0, limit) : sessions;
}

/**
 * Get all experiments
 */
export async function getExperiments(limit?: number): Promise<Experiment[]> {

	const notes = await readNotesFromDir('03-Experiments');

	const experiments = notes.map(note => ({
		...note,
		component: note.frontmatter.component || 'Unknown',
		hypothesis: note.frontmatter.hypothesis || '',
	})) as Experiment[];

	return limit ? experiments.slice(0, limit) : experiments;
}

/**
 * Get all milestones
 */
export async function getMilestones(limit?: number): Promise<Milestone[]> {

	const notes = await readNotesFromDir('09-Milestones');

	const milestones = notes.map(note => {

		const achievements = extractList(note.content, '## Achievement Summary');
		const breakthroughs = extractList(note.content, '## Technical Breakthroughs');
		const metrics = extractTable(note.content, '## Key Metrics');

		return {
			...note,
			achievements,
			metrics,
			breakthroughs,
		} as Milestone;
	});

	return limit ? milestones.slice(0, limit) : milestones;
}

/**
 * Get all architecture docs
 */
export async function getArchitectureDocs(): Promise<ObsidianNote[]> {

	return readNotesFromDir('01-Architecture');
}

/**
 * Get all decisions (ADRs)
 */
export async function getDecisions(): Promise<ObsidianNote[]> {

	return readNotesFromDir('04-Decisions');
}

/**
 * Get recent daily notes
 */
export async function getDailyNotes(days: number = 7): Promise<ObsidianNote[]> {

	const notes = await readNotesFromDir('07-Daily-Notes');
	return notes.slice(0, days);
}

/**
 * Get vault statistics
 */
export async function getVaultStats() {

	const [sessions, experiments, milestones, architecture, decisions, dailyNotes] = await Promise.all([
		getSessions(),
		getExperiments(),
		getMilestones(),
		getArchitectureDocs(),
		getDecisions(),
		getDailyNotes(30),
	]);

	return {
		totalSessions: sessions.length,
		totalExperiments: experiments.length,
		totalMilestones: milestones.length,
		totalArchitectureDocs: architecture.length,
		totalDecisions: decisions.length,
		totalDailyNotes: dailyNotes.length,
		recentSessions: sessions.slice(0, 5),
		recentExperiments: experiments.slice(0, 5),
		recentMilestones: milestones.slice(0, 3),
	};
}

/**
 * Search across all vault content
 */
export async function searchVault(query: string, limit: number = 20): Promise<ObsidianNote[]> {

	const allDirs = [
		'01-Architecture',
		'02-Components',
		'03-Experiments',
		'04-Decisions',
		'05-Agent-Sessions',
		'06-Research',
		'07-Daily-Notes',
		'08-References',
		'09-Milestones',
	];

	const allNotes: ObsidianNote[] = [];

	for (const dir of allDirs) {

		const notes = await readNotesFromDir(dir);
		allNotes.push(...notes);
	}

	const queryLower = query.toLowerCase();

	const results = allNotes.filter(note => {

		return (
			note.title.toLowerCase().includes(queryLower) ||
			note.content.toLowerCase().includes(queryLower) ||
			note.frontmatter.tags?.some(tag => tag.toLowerCase().includes(queryLower))
		);
	});

	return results
		.sort((a, b) => b.modified.getTime() - a.modified.getTime())
		.slice(0, limit);
}

/**
 * Extract knowledge graph connections
 */
export async function getKnowledgeGraph() {

	const allDirs = [
		'01-Architecture',
		'02-Components',
		'03-Experiments',
		'04-Decisions',
		'05-Agent-Sessions',
		'09-Milestones',
	];

	const allNotes: ObsidianNote[] = [];

	for (const dir of allDirs) {

		const notes = await readNotesFromDir(dir);
		allNotes.push(...notes);
	}

	const nodes = allNotes.map(note => ({
		id: note.id,
		title: note.title,
		type: note.frontmatter.type || 'note',
		category: note.path.split('/')[0],
	}));

	const links: { source: string; target: string }[] = [];

	// Extract [[wiki-links]]
	allNotes.forEach(note => {

		const linkMatches = note.content.matchAll(/\[\[([^\]]+)\]\]/g);

		for (const match of linkMatches) {

			const targetTitle = match[1];

			// Find the target note
			const targetNote = allNotes.find(n =>
				n.title === targetTitle ||
				n.id.includes(targetTitle.toLowerCase().replace(/\s+/g, '-'))
			);

			if (targetNote) {

				links.push({
					source: note.id,
					target: targetNote.id,
				});
			}
		}
	});

	return { nodes, links };
}

/**
 * Helper: Extract bulleted list from section
 */
function extractList(content: string, sectionHeader: string): string[] {

	// Escape special regex characters in the section header
	const escapedHeader = sectionHeader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const sectionRegex = new RegExp(`${escapedHeader}([\\s\\S]*?)(?=\\n##|$)`, 'i');
	const match = content.match(sectionRegex);

	if (!match) return [];

	const sectionContent = match[1];
	const items: string[] = [];

	const listItems = sectionContent.matchAll(/^[\s]*[-*]\s+(?:\[.\]\s+)?(.+)$/gm);

	for (const item of listItems) {

		items.push(item[1].trim());
	}

	return items;
}

/**
 * Helper: Extract markdown table
 */
function extractTable(content: string, sectionHeader: string): Record<string, any> {

	const sectionRegex = new RegExp(`${sectionHeader}([\\s\\S]*?)(?=\\n##|$)`, 'i');
	const match = content.match(sectionRegex);

	if (!match) return {};

	const sectionContent = match[1];
	const rows = sectionContent.split('\n').filter(line => line.includes('|'));

	if (rows.length < 3) return {}; // Need header, separator, and at least one row

	const result: Record<string, any> = {};

	// Parse table rows (skip header and separator)
	for (let i = 2; i < rows.length; i++) {

		const cells = rows[i].split('|').map(c => c.trim()).filter(Boolean);

		if (cells.length >= 2) {

			result[cells[0]] = {
				value: cells[1],
				...(cells.length > 2 && { details: cells.slice(2) }),
			};
		}
	}

	return result;
}

/**
 * Get single note by path
 */
export async function getNote(relativePath: string): Promise<ObsidianNote | null> {

	const fullPath = path.join(VAULT_ROOT, relativePath);

	if (!fs.existsSync(fullPath)) {

		return null;
	}

	const stats = fs.statSync(fullPath);
	const content = fs.readFileSync(fullPath, 'utf-8');
	const { data: frontmatter, content: markdownContent } = matter(content);

	const titleMatch = markdownContent.match(/^#\s+(.+)$/m);
	const title = titleMatch ? titleMatch[1] : path.basename(relativePath, '.md');

	return {
		id: path.basename(relativePath, '.md'),
		title,
		content: markdownContent,
		frontmatter: frontmatter as FrontMatter,
		path: relativePath,
		created: stats.birthtime,
		modified: stats.mtime,
	};
}
