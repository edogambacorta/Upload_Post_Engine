import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { StudioState, PostType, Slide, PreviewMode, CompositionMode, SlideTemplate } from './types';

type Action =
    | { type: 'SET_MODE'; payload: PostType }
    | { type: 'SET_COMPOSITION'; payload: CompositionMode }
    | { type: 'SET_TOPIC'; payload: string }
    | { type: 'SET_AUDIENCE'; payload: string }
    | { type: 'SET_LLM_MODEL'; payload: string }
    | { type: 'SET_IMAGE_MODEL'; payload: string }
    | { type: 'ADD_SLIDE'; payload: Slide }
    | { type: 'SET_SLIDES'; payload: Slide[] }
    | { type: 'REORDER_SLIDES'; payload: { fromIndex: number; toIndex: number } }
    | { type: 'UPDATE_SLIDE'; payload: { id: string; updates: Partial<Slide> } }
    | { type: 'SET_SELECTED_SLIDE'; payload: string | null }
    | { type: 'SET_SCENE_TEMPLATE'; payload: string }
    | { type: 'ADD_TEMPLATE'; payload: SlideTemplate }
    | { type: 'UPDATE_TEMPLATE'; payload: { id: string; updates: Partial<SlideTemplate> } }
    | { type: 'DELETE_TEMPLATE'; payload: string }
    | { type: 'SET_ACTIVE_TEMPLATE'; payload: string | null }
    | { type: 'SET_GENERATING'; payload: boolean }
    | { type: 'SET_VIEW'; payload: 'dashboard' | 'editor' | 'batch' }
    | { type: 'SET_EDIT_MODE'; payload: 'text' | 'image' }
    | { type: 'SET_PREVIEW_MODE'; payload: PreviewMode };

const initialState: StudioState = {
    mode: 'infographic',
    composition: 'single',
    topic: '',
    audience: '',
    llmModel: 'openrouter-gpt-4.1',
    imageModel: 'flux-schnell',
    slides: [],
    selectedSlideId: null,
    sceneTemplateId: null,
    templates: [],
    activeTemplateId: null,
    isGenerating: false,
    view: 'dashboard',
    editMode: 'text',
    previewMode: 'text',
};

const StudioContext = createContext<{
    state: StudioState;
    dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

function studioReducer(state: StudioState, action: Action): StudioState {
    switch (action.type) {
        case 'SET_MODE':
            return { ...state, mode: action.payload };
        case 'SET_COMPOSITION':
            return { ...state, composition: action.payload };
        case 'SET_TOPIC':
            return { ...state, topic: action.payload };
        case 'SET_AUDIENCE':
            return { ...state, audience: action.payload };
        case 'SET_LLM_MODEL':
            return { ...state, llmModel: action.payload };
        case 'SET_IMAGE_MODEL':
            return { ...state, imageModel: action.payload };
        case 'ADD_SLIDE':
            return { ...state, slides: [...state.slides, action.payload] };
        case 'SET_SLIDES':
            return { ...state, slides: action.payload };
        case 'REORDER_SLIDES': {
            const next = [...state.slides];
            const { fromIndex, toIndex } = action.payload;
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return { ...state, slides: next };
        }
        case 'UPDATE_SLIDE':
            return {
                ...state,
                slides: state.slides.map((slide) =>
                    slide.id === action.payload.id ? { ...slide, ...action.payload.updates } : slide
                ),
            };
        case 'SET_SELECTED_SLIDE':
            return { ...state, selectedSlideId: action.payload };
        case 'SET_SCENE_TEMPLATE':
            return { ...state, sceneTemplateId: action.payload };
        case 'ADD_TEMPLATE':
            return { ...state, templates: [...state.templates, action.payload] };
        case 'UPDATE_TEMPLATE':
            return {
                ...state,
                templates: state.templates.map((tpl) =>
                    tpl.id === action.payload.id ? { ...tpl, ...action.payload.updates } : tpl
                ),
            };
        case 'DELETE_TEMPLATE':
            return {
                ...state,
                templates: state.templates.filter((tpl) => tpl.id !== action.payload),
                activeTemplateId:
                    state.activeTemplateId === action.payload ? null : state.activeTemplateId,
            };
        case 'SET_ACTIVE_TEMPLATE':
            return { ...state, activeTemplateId: action.payload };
        case 'SET_GENERATING':
            return { ...state, isGenerating: action.payload };
        case 'SET_VIEW':
            return { ...state, view: action.payload };
        case 'SET_EDIT_MODE':
            return { ...state, editMode: action.payload };
        case 'SET_PREVIEW_MODE':
            return { ...state, previewMode: action.payload };
    }
}

export function StudioProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(studioReducer, initialState);

    return (
        <StudioContext.Provider value={{ state, dispatch }}>
            {children}
        </StudioContext.Provider>
    );
}

export function useStudio() {
    const context = useContext(StudioContext);
    if (context === undefined) {
        throw new Error('useStudio must be used within a StudioProvider');
    }
    return context;
}
