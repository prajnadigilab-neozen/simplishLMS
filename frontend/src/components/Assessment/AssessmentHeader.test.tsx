import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssessmentHeader from './AssessmentHeader';

describe('AssessmentHeader component', () => {
    it('renders the correct question number and total', () => {
        render(<AssessmentHeader currentQuestion={0} totalQuestions={10} onExit={() => {}} />);
        expect(screen.getByText('Question 1 of 10')).toBeInTheDocument();
    });

    it('updates text for later questions', () => {
        render(<AssessmentHeader currentQuestion={4} totalQuestions={10} onExit={() => {}} />);
        expect(screen.getByText('Question 5 of 10')).toBeInTheDocument();
    });

    it('calls onExit when the exit button is clicked', () => {
        const onExit = vi.fn();
        render(<AssessmentHeader currentQuestion={0} totalQuestions={10} onExit={onExit} />);
        
        fireEvent.click(screen.getByText('Exit'));
        expect(onExit).toHaveBeenCalledOnce();
    });
});
