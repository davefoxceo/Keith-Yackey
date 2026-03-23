/**
 * Stub type declarations for ruvector (SONA engine).
 * The SONA module is optional — the client works without it.
 */
declare module 'ruvector' {
  export namespace Sona {
    function isAvailable(): boolean;

    class Engine {
      static withConfig(config: Record<string, unknown>): Engine;
      tick(): void;
      flush(): void;
      isEnabled(): boolean;
      getStats(): Record<string, number>;
      beginTrajectory(embedding: number[]): number;
      addStep(
        trajId: number,
        activations: number[],
        attention: number[],
        reward: number,
      ): void;
      addContext(trajId: number, context: string): void;
      endTrajectory(trajId: number, quality: number): void;
      applyMicroLora(embedding: number[]): number[];
      findPatterns(embedding: number[], limit: number): unknown[];
      forceLearn(): string;
    }
  }
}
