/**
 * Lightweight timing helper for API performance monitoring.
 * Emits structured JSON logs with minimal overhead.
 */

interface MarkWithTimestamp {
    label: string;
    duration: number;
    timestamp: number;
}

export interface TimingMetadata {
    cache?: 'hit' | 'miss';
    rows?: number;
    size?: number;
}

export class Timer {
    private readonly startTime: number;
    private readonly marks: Map<string, number> = new Map();
    private marksArray: MarkWithTimestamp[] = [];

    constructor() {
        this.startTime = Date.now();
    }

    /**
     * Record a timing checkpoint.
     * Duration is relative to previous mark or start.
     */
    mark(label: string): void {
        const now = Date.now();
        const prevTimestamp = this.marksArray.length > 0
            ? this.marksArray[this.marksArray.length - 1].timestamp
            : this.startTime;
        const duration = now - prevTimestamp;

        this.marks.set(label, now);
        this.marksArray.push({ label, duration, timestamp: now });
    }

    /**
     * End timing and log structured JSON.
     * Returns total duration in ms.
     */
    end(
        endpoint: string,
        paramsHash: string,
        metadata?: TimingMetadata,
    ): number {
        const total = Date.now() - this.startTime;

        console.log(JSON.stringify({
            type: 'api_timing',
            endpoint,
            paramsHash,
            cache: metadata?.cache,
            timings: this.marksArray.map(({ label, duration }) => ({ label, duration })),
            totalMs: total,
            meta: {
                rows: metadata?.rows,
                size: metadata?.size,
            },
        }));

        return total;
    }
}
