import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { StudioState, PostType, Slide } from './types';

type Action =
    | { type: 'SET_MODE'; payload: PostType }
    | { type: 'SET_TOPIC'; payload: string }
    | { type: 'SET_AUDIENCE'; payload: string }
    | { type: 'SET_LLM_MODEL'; payload: string }
    | { type: 'SET_IMAGE_MODEL'; payload: string }
    | { type: 'ADD_SLIDE'; payload: Slide }
    | { type: 'SET_SLIDES'; payload: Slide[] }
    | { type: 'UPDATE_SLIDE'; payload: { id: string; updates: Partial<Slide> } }
    | { type: 'SET_SELECTED_SLIDE'; payload: string | null }
    | { type: 'SET_SCENE_TEMPLATE'; payload: string }
    | { type: 'SET_GENERATING'; payload: boolean }
    | { type: 'SET_VIEW'; payload: 'dashboard' | 'editor' | 'batch' }
    | { type: 'SET_EDIT_MODE'; payload: 'text' | 'image' };

const initialState: StudioState = {
    mode: 'infographic',
    topic: '',
    audience: '',
    llmModel: 'openrouter-gpt-4.1',
    imageModel: 'flux-schnell',
    slides: [],
    selectedSlideId: null,
    sceneTemplateId: null,
    isGenerating: false,
    view: 'dashboard',
    editMode: 'image',
};

const StudioContext = createContext<{
    state: StudioState;
    dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

function studioReducer(state: StudioState, action: Action): StudioState {
    switch (action.type) {
        case 'SET_MODE':
            return { ...state, mode: action.payload };
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
        case 'SET_GENERATING':
            return { ...state, isGenerating: action.payload };
        case 'SET_VIEW':
            return { ...state, view: action.payload };
        case 'SET_EDIT_MODE':
            return { ...state, editMode: action.payload };
        default:
            return state;
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
