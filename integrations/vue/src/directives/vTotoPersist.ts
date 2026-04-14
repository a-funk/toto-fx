import type { Directive, DirectiveBinding, VNode } from 'vue';
import { TotoFXInjectionKey, type TotoFXContext } from '../plugin';

interface PersistValue {
  category: string;
  key: string;
  style?: string;
  variant?: string;
  [k: string]: any;
}

function getContext(vnode: VNode): TotoFXContext | undefined {
  return (vnode.appContext?.app as any)?._context?.provides?.[TotoFXInjectionKey as any] as TotoFXContext | undefined
    ?? vnode.appContext?.provides?.[TotoFXInjectionKey as symbol] as TotoFXContext | undefined;
}

function extractState(value: PersistValue): Record<string, any> | undefined {
  const { category, key, ...state } = value;
  return Object.keys(state).length > 0 ? state : undefined;
}

const prevValueMap = new WeakMap<HTMLElement, PersistValue>();

export const vTotoPersist: Directive<HTMLElement, PersistValue> = {
  mounted(el, binding, vnode) {
    const context = getContext(vnode);
    if (!context) {
      console.warn('v-toto-persist: TotoFXPlugin is not installed.');
      return;
    }

    const { engine } = context;
    const { category, key } = binding.value;
    const state = extractState(binding.value);

    engine.set(category, key, state);
    prevValueMap.set(el, { ...binding.value });
  },

  updated(el, binding, vnode) {
    const context = getContext(vnode);
    if (!context) return;

    const { engine } = context;
    const prev = prevValueMap.get(el);
    const curr = binding.value;

    const changed =
      !prev ||
      prev.category !== curr.category ||
      prev.key !== curr.key ||
      JSON.stringify(extractState(prev)) !== JSON.stringify(extractState(curr));

    if (changed) {
      if (prev) {
        engine.clear(prev.category, prev.key);
      }
      engine.set(curr.category, curr.key, extractState(curr));
      prevValueMap.set(el, { ...curr });
    }
  },

  unmounted(el, binding, vnode) {
    const context = getContext(vnode);
    if (!context) return;

    const { engine } = context;
    const val = prevValueMap.get(el) || binding.value;
    engine.clear(val.category, val.key);
    prevValueMap.delete(el);
  },
};
