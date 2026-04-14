import type { App, InjectionKey } from 'vue';
import { createEngine, createDotgrid } from 'toto-fx';

export interface TotoFXPluginOptions {
  plugins?: any[];
  dotgridPlugins?: any[];
  dotgridConfig?: Record<string, any>;
  engineConfig?: Record<string, any>;
}

export interface TotoFXContext {
  engine: ReturnType<typeof createEngine>;
  dotgrid: ReturnType<typeof createDotgrid> | null;
}

export const TotoFXInjectionKey: InjectionKey<TotoFXContext> = Symbol('toto-fx');

export const TotoFXPlugin = {
  install(app: App, options: TotoFXPluginOptions = {}) {
    const {
      plugins = [],
      dotgridPlugins = [],
      dotgridConfig,
      engineConfig = {},
    } = options;

    // Create engine
    const engine = createEngine({
      ...engineConfig,
      resolveElement: (key: string) =>
        document.querySelector(`[data-toto-key="${key}"]`) as HTMLElement | null,
    });

    for (const plugin of plugins) {
      engine.use(plugin);
    }

    // Create dotgrid if config provided
    let dotgrid: ReturnType<typeof createDotgrid> | null = null;
    if (dotgridConfig) {
      dotgrid = createDotgrid(dotgridConfig);
      for (const plugin of dotgridPlugins) {
        dotgrid.use(plugin);
      }
      engine.setDotgrid(dotgrid);
    }

    // Initialize
    engine.init();
    if (dotgrid) {
      dotgrid.init();
    }

    // Provide context
    const context: TotoFXContext = { engine, dotgrid };
    app.provide(TotoFXInjectionKey, context);

    // Cleanup on unmount
    const destroy = () => {
      engine.clearAll();
      engine.destroy();
      if (dotgrid) {
        dotgrid.destroy();
      }
    };

    if (typeof app.onUnmount === 'function') {
      app.onUnmount(destroy);
    } else {
      // Fallback: expose destroy on the app config for manual teardown
      app.config.globalProperties.$totoFXDestroy = destroy;
    }
  },
};
