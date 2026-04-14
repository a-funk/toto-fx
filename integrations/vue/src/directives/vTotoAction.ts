import type { Directive, DirectiveBinding } from 'vue';
import { TotoFXInjectionKey, type TotoFXContext } from '../plugin';

const handlerMap = new WeakMap<HTMLElement, EventListener>();

export const vTotoAction: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding, vnode) {
    const context = (vnode.appContext?.app as any)?._context?.provides?.[TotoFXInjectionKey as any] as TotoFXContext | undefined
      ?? vnode.appContext?.provides?.[TotoFXInjectionKey as symbol] as TotoFXContext | undefined;

    if (!context) {
      console.warn('v-toto-action: TotoFXPlugin is not installed.');
      return;
    }

    const { engine } = context;
    const category = Object.keys(binding.modifiers)[0] || 'action';

    const handler = () => {
      engine.play(category, el, { params: binding.value });
    };

    handlerMap.set(el, handler);
    el.addEventListener('click', handler);
  },

  unmounted(el: HTMLElement) {
    const handler = handlerMap.get(el);
    if (handler) {
      el.removeEventListener('click', handler);
      handlerMap.delete(el);
    }
  },
};
