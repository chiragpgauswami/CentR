import type { AgentToolEvent } from '../agents/types.js';

export interface RepeatedExplorationStats {
  repeatedFileReads: number;
  repeatedSearches: number;
  totalRepeatedExplorations: number;
  details: string[];
}

/**
 * Conservative heuristic for redundant exploration:
 * - A file read is considered redundant if read 3+ times without any write/modify event in between.
 * - A search query or grep pattern is considered redundant if repeated identically with no intervening edits.
 */
export function calculateRepeatedExploration(events: AgentToolEvent[]): RepeatedExplorationStats {
  const readCounts = new Map<string, number>();
  const searchCounts = new Map<string, number>();
  let repeatedFileReads = 0;
  let repeatedSearches = 0;
  const details: string[] = [];

  for (const ev of events) {
    if (ev.tool === 'view_file' || ev.tool === 'read_file') {
      const target = ev.target || 'unknown';
      const count = (readCounts.get(target) || 0) + 1;
      readCounts.set(target, count);
      if (count >= 3) {
        repeatedFileReads++;
        details.push(`File "${target}" read ${count} times without intermediate edit`);
      }
    } else if (ev.tool === 'grep_search' || ev.tool === 'find_by_name' || ev.tool === 'search') {
      const query = ev.target || 'unknown';
      const count = (searchCounts.get(query) || 0) + 1;
      searchCounts.set(query, count);
      if (count >= 2) {
        repeatedSearches++;
        details.push(`Search query "${query}" repeated ${count} times`);
      }
    } else if (ev.tool === 'replace_file_content' || ev.tool === 'write_to_file') {
      // Clear consecutive read counter upon write to target file
      if (ev.target) {
        readCounts.delete(ev.target);
      }
    }
  }

  return {
    repeatedFileReads,
    repeatedSearches,
    totalRepeatedExplorations: repeatedFileReads + repeatedSearches,
    details,
  };
}
