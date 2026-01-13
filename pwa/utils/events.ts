export const AppEvents = {
    PROJECTS_UPDATED: 'PROJECTS_UPDATED',
};

export const triggerProjectsUpdate = () => {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(AppEvents.PROJECTS_UPDATED));
    }
};

export const listenToProjectsUpdate = (callback: () => void) => {
    if (typeof window !== 'undefined') {
        window.addEventListener(AppEvents.PROJECTS_UPDATED, callback);
        return () => window.removeEventListener(AppEvents.PROJECTS_UPDATED, callback);
    }
    return () => { };
};
