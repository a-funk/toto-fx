/**
 * @module types
 * @description JSDoc type definitions for toto-fx.
 *
 * This file contains no runtime code -- only type annotations for
 * editor IntelliSense and documentation generation.
 */

/**
 * @typedef {Object} TotoFXConfig
 * @property {HTMLElement} [root] - Root element for DOM observation (default: document.body)
 * @property {ElementResolver} [resolveElement] - Default element resolver function
 * @property {Function} [onRefresh] - Refresh callback: (groupId: string) => void|Promise
 * @property {ContainerResolver} [containerResolver] - Maps groupId to container element for layout animation
 * @property {number} [layoutDuration] - Layout animation duration in ms (default: 300)
 * @property {string} [layoutEasing] - Layout animation CSS easing (default: 'ease-out')
 */

/**
 * A function that resolves an opaque string key to a DOM element.
 * @callback ElementResolver
 * @param {string} key - The element key
 * @returns {HTMLElement|null}
 */

/**
 * A function that resolves a group ID to a container element.
 * @callback ContainerResolver
 * @param {string} groupId - The group/list ID
 * @returns {HTMLElement|null}
 */

/**
 * @typedef {Object} CategoryDescriptor
 * @property {ElementResolver} [resolve] - Key-to-element resolver for this category.
 *   Falls back to the engine's default resolver if not provided.
 * @property {CategoryPlayFunction} play - Animation trigger function.
 * @property {CategoryStopFunction} [stop] - Teardown function called when animation
 *   is cleared via engine.clear() or stopped by the reconciler before re-application.
 *   Should undo whatever play() did (remove classes, clear inline styles, etc.).
 */

/**
 * Called by the engine to start/play an animation on an element.
 * @callback CategoryPlayFunction
 * @param {HTMLElement} el - The element to animate
 * @param {CategoryPlayParams} params - Animation parameters
 */

/**
 * Called by the engine to stop/teardown an animation on an element.
 * Should undo whatever play() did (remove classes, clear inline styles, etc.).
 * @callback CategoryStopFunction
 * @param {HTMLElement} el - The element to clean up
 */

/**
 * @typedef {Object} CategoryPlayParams
 * @property {Function} [onDone] - Completion callback
 * @property {number} [elapsed] - ms since animation started (for phase continuity)
 * @property {string} [style] - Animation style name
 * @property {string} [variant] - Animation variant name
 * @property {Object} [params] - Additional animation parameters
 * @property {string} [key] - Element key
 * @property {string} [groupId] - Group ID
 * @property {Object} [styleOverride] - Style/variant override
 */

/**
 * @typedef {Object} AnimationPlugin
 * @property {string} [name] - Plugin name
 * @property {Function} [install] - Legacy install function: (engine, config) => void
 * @property {Object<string, CategoryDescriptor>} [categories] - Categories to register
 * @property {Object<string, FXLayer>} [fx] - FX layers to register
 */

/**
 * @typedef {Object} FXLayer
 * @property {Function} [apply] - Apply FX to an element
 * @property {Function} [trigger] - Trigger a one-shot FX
 * @property {Object} [params] - Parameter descriptors
 */

/**
 * @typedef {Object} PersistentAnimationParams
 * @property {string} [style] - Animation style (e.g., 'ambient')
 * @property {string} [variant] - Animation variant (e.g., 'glow')
 * @property {string} [groupId] - Group ID for group queries
 * @property {Object} [params] - Additional variant-specific parameters
 */

/**
 * @typedef {Object} PlayOptions
 * @property {Function} [onDone] - Called when animation completes
 * @property {Object} [styleOverride] - Override style/variant
 * @property {Object} [params] - Additional parameters
 */
