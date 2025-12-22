/**
 * Fleet Chat Plugin Renderer
 *
 * React-to-Lit compilation system for Raycast plugin compatibility
 * Translates React JSX into Lit web components
 */
import { html } from 'lit';
/**
 * React-like createElement function for building element trees
 */
export function createElement(type, props, ...children) {
    return {
        type,
        props: props || {},
        children: children.flat().filter(child => child != null)
    };
}
/**
 * Fragment support
 */
export const Fragment = 'Fragment';
/**
 * React-to-Lit Compiler
 * Transforms React element trees into Lit templates
 */
export class ReactToLitCompiler {
    constructor() {
        this.componentRegistry = new Map();
        this.eventHandlerRegistry = new Map();
        this.componentIdCounter = 0;
        this.registerBuiltinComponents();
    }
    /**
     * Register a React component function
     */
    registerComponent(name, componentFn) {
        this.componentRegistry.set(name, componentFn);
    }
    /**
     * Register built-in UI components
     */
    registerBuiltinComponents() {
        // Register core Raycast components
        this.componentRegistry.set('List', this.createListComponent.bind(this));
        this.componentRegistry.set('List.Item', this.createListItemComponent.bind(this));
        this.componentRegistry.set('Detail', this.createDetailComponent.bind(this));
        this.componentRegistry.set('ActionPanel', this.createActionPanelComponent.bind(this));
        this.componentRegistry.set('Action', this.createActionComponent.bind(this));
        this.componentRegistry.set('Form', this.createFormComponent.bind(this));
        this.componentRegistry.set('Grid', this.createGridComponent.bind(this));
        this.componentRegistry.set('Grid.Item', this.createGridItemComponent.bind(this));
    }
    /**
     * Compile React element to Lit template
     */
    compile(element) {
        if (typeof element === 'string' || typeof element === 'number') {
            return html `${element}`;
        }
        if (element == null) {
            return html ``;
        }
        if (Array.isArray(element)) {
            return html `${element.map(child => this.compile(child))}`;
        }
        if (typeof element.type === 'string') {
            return this.compileHTMLTag(element);
        }
        if (typeof element.type === 'function') {
            return this.compileComponent(element);
        }
        return html ``;
    }
    /**
     * Compile HTML tags
     */
    compileHTMLTag(element) {
        const { type, props, children } = element;
        // Handle fragments
        if (type === Fragment) {
            return html `${children?.map(child => this.compile(child))}`;
        }
        // Build template with props and children
        const attrs = this.buildAttributes(props);
        const childTemplates = children?.map(child => this.compile(child));
        return html `<${type} ${attrs}>${childTemplates}</${type}>`;
    }
    /**
     * Compile React component
     */
    compileComponent(element) {
        const componentFn = this.componentRegistry.get(element.type);
        if (!componentFn) {
            console.warn(`Unknown component: ${element.type}`);
            return html `<div>Unknown component: ${element.type}</div>`;
        }
        try {
            const result = componentFn(element.props);
            if (typeof result === 'string' || typeof result === 'number') {
                return html `${result}`;
            }
            if (result && typeof result === 'object') {
                return this.compile(result);
            }
            return html ``;
        }
        catch (error) {
            console.error(`Error compiling component ${element.type}:`, error);
            return html `<div>Error in component ${element.type}</div>`;
        }
    }
    /**
     * Build HTML attributes from props
     */
    buildAttributes(props) {
        if (!props)
            return '';
        const attrs = [];
        for (const [key, value] of Object.entries(props)) {
            if (key === 'children')
                continue;
            if (key.startsWith('on') && typeof value === 'function') {
                // Event handlers will be handled separately
                continue;
            }
            if (key === 'className') {
                attrs.push(`class="${value}"`);
            }
            else if (key === 'htmlFor') {
                attrs.push(`for="${value}"`);
            }
            else if (key === 'style' && typeof value === 'object') {
                const styles = Object.entries(value)
                    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
                    .join(';');
                attrs.push(`style="${styles}"`);
            }
            else if (typeof value === 'string' || typeof value === 'number') {
                attrs.push(`${key}="${value}"`);
            }
            else if (value === true) {
                attrs.push(key);
            }
        }
        return attrs.join(' ');
    }
    /**
     * Create List component
     */
    createListComponent(props) {
        return {
            type: 'fc-list',
            props: {
                enableSearch: props.searchBar?.enable ?? true,
                searchPlaceholder: props.searchBar?.placeholder ?? 'Search...',
                isLoading: props.isLoading ?? false,
                emptyStateTitle: props.emptyState?.title ?? 'No Items',
                emptyStateDescription: props.emptyState?.description ?? '',
                emptyStateIcon: props.emptyState?.icon ?? '📋'
            },
            children: props.children || []
        };
    }
    /**
     * Create List Item component
     */
    createListItemComponent(props) {
        return {
            type: 'div',
            props: {
                className: 'list-item',
                'data-title': props.title,
                'data-subtitle': props.subtitle,
                'data-icon': props.icon
            },
            children: [
                props.icon && {
                    type: 'div',
                    props: { className: 'item-icon' },
                    children: [props.icon]
                },
                {
                    type: 'div',
                    props: { className: 'item-content' },
                    children: [
                        {
                            type: 'div',
                            props: { className: 'item-title' },
                            children: [props.title]
                        },
                        props.subtitle && {
                            type: 'div',
                            props: { className: 'item-subtitle' },
                            children: [props.subtitle]
                        }
                    ].filter(Boolean)
                },
                props.accessories && {
                    type: 'div',
                    props: { className: 'item-accessories' },
                    children: props.accessories.map((acc) => ({
                        type: 'span',
                        props: { className: 'accessory' },
                        children: [acc.text || acc.tag?.value || '']
                    }))
                },
                props.actions && this.createActionPanelComponent({ children: props.actions })
            ].filter(Boolean)
        };
    }
    /**
     * Create Detail component
     */
    createDetailComponent(props) {
        return {
            type: 'fc-detail',
            props: {
                markdown: props.markdown || '',
                isLoading: props.isLoading ?? false,
                metadata: props.metadata || []
            },
            children: props.children || []
        };
    }
    /**
     * Create ActionPanel component
     */
    createActionPanelComponent(props) {
        return {
            type: 'div',
            props: { className: 'action-panel' },
            children: props.children || []
        };
    }
    /**
     * Create Action component
     */
    createActionComponent(props) {
        return {
            type: 'button',
            props: {
                className: 'action-item',
                'data-title': props.title,
                'data-shortcut': props.shortcut
            },
            children: [
                props.icon && {
                    type: 'span',
                    props: { className: 'action-icon' },
                    children: [props.icon]
                },
                {
                    type: 'span',
                    props: { className: 'action-text' },
                    children: [props.title]
                },
                props.shortcut && {
                    type: 'span',
                    props: { className: 'action-shortcut' },
                    children: [props.shortcut]
                }
            ].filter(Boolean)
        };
    }
    /**
     * Create Form component
     */
    createFormComponent(props) {
        return {
            type: 'fc-form',
            props: {
                isLoading: props.isLoading ?? false,
                actions: props.actions
            },
            children: props.children || []
        };
    }
    /**
     * Create Grid component
     */
    createGridComponent(props) {
        return {
            type: 'fc-grid',
            props: {
                columns: props.columns,
                itemSize: props.itemSize,
                fit: props.fit ?? false,
                aspectRatio: props.aspectRatio
            },
            children: props.children || []
        };
    }
    /**
     * Create Grid Item component
     */
    createGridItemComponent(props) {
        return {
            type: 'div',
            props: {
                className: 'grid-item',
                'data-title': props.title,
                'data-content': props.content
            },
            children: [
                props.icon && {
                    type: 'div',
                    props: { className: 'grid-item-icon' },
                    children: [props.icon]
                },
                {
                    type: 'div',
                    props: { className: 'grid-item-content' },
                    children: [
                        props.title && {
                            type: 'div',
                            props: { className: 'grid-item-title' },
                            children: [props.title]
                        },
                        props.subtitle && {
                            type: 'div',
                            props: { className: 'grid-item-subtitle' },
                            children: [props.subtitle]
                        }
                    ].filter(Boolean)
                }
            ].filter(Boolean)
        };
    }
    /**
     * Register event handler for component
     */
    registerEventHandler(componentId, eventType, handler) {
        if (!this.eventHandlerRegistry.has(componentId)) {
            this.eventHandlerRegistry.set(componentId, new Map());
        }
        this.eventHandlerRegistry.get(componentId).set(eventType, handler);
    }
    /**
     * Get event handler for component
     */
    getEventHandler(componentId, eventType) {
        return this.eventHandlerRegistry.get(componentId)?.get(eventType);
    }
    /**
     * Clear event handlers for component
     */
    clearEventHandlers(componentId) {
        this.eventHandlerRegistry.delete(componentId);
    }
    /**
     * Convert React JSX to Lit template
     */
    jsxToTemplate(jsxElement) {
        return this.compile(jsxElement);
    }
}
/**
 * Global compiler instance
 */
export const reactToLitCompiler = new ReactToLitCompiler();
/**
 * Create React-like JSX elements
 */
export const h = createElement;
// Re-export from other renderer modules when they exist
// export * from './event-system.js';
// export * from './react-compat.js';
// export * from './serialization.js';
