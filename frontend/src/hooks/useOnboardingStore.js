import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useOnboardingStore = create(
    persist(
        (set) => ({
            dob: '',
            employmentStatus: 'Student',
            personalAddress: '',
            place: '',
            pincode: '',
            
            // Actions
            setField: (field, value) => set((state) => ({ [field]: value })),
            resetStore: () => set({
                dob: '',
                employmentStatus: 'Student',
                personalAddress: '',
                place: '',
                pincode: ''
            })
        }),
        {
            name: 'simplish_onboarding_form_cache'
        }
    )
);
