import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MatchingQuestion from './MatchingQuestion';

describe('MatchingQuestion component', () => {
    const pairs = [
        { english: 'Hello', kannada: 'ನಮಸ್ಕಾರ' },
        { english: 'Water', kannada: 'ನೀರು' }
    ];
    const shuffledOptions = ['ನೀರು', 'ನಮಸ್ಕಾರ'];
    
    it('renders English items and Kannada options correctly', () => {
        render(
            <MatchingQuestion 
                pairs={pairs} 
                shuffledOptions={shuffledOptions} 
                activeMatchLeft={null} 
                matchingAnswers={{}} 
                onSelectLeft={() => {}} 
                onSelectRight={() => {}} 
            />
        );
        
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Water')).toBeInTheDocument();
        expect(screen.getByText('ನಮಸ್ಕಾರ')).toBeInTheDocument();
        expect(screen.getByText('ನೀರು')).toBeInTheDocument();
    });

    it('calls onSelectLeft when an English item is clicked', () => {
        const onSelectLeft = vi.fn();
        render(
            <MatchingQuestion 
                pairs={pairs} 
                shuffledOptions={shuffledOptions} 
                activeMatchLeft={null} 
                matchingAnswers={{}} 
                onSelectLeft={onSelectLeft} 
                onSelectRight={() => {}} 
            />
        );
        
        fireEvent.click(screen.getByText('Hello'));
        expect(onSelectLeft).toHaveBeenCalledWith('Hello');
    });

    it('calls onSelectRight when a Kannada item is clicked', () => {
        const onSelectRight = vi.fn();
        render(
            <MatchingQuestion 
                pairs={pairs} 
                shuffledOptions={shuffledOptions} 
                activeMatchLeft="Hello" 
                matchingAnswers={{}} 
                onSelectLeft={() => {}} 
                onSelectRight={onSelectRight} 
            />
        );
        
        fireEvent.click(screen.getByText('ನಮಸ್ಕಾರ'));
        expect(onSelectRight).toHaveBeenCalledWith('ನಮಸ್ಕಾರ');
    });

    it('shows "Linked" when an item is matched', () => {
        render(
            <MatchingQuestion 
                pairs={pairs} 
                shuffledOptions={shuffledOptions} 
                activeMatchLeft={null} 
                matchingAnswers={{ 'Hello': 'ನಮಸ್ಕಾರ' }} 
                onSelectLeft={() => {}} 
                onSelectRight={() => {}} 
            />
        );
        
        expect(screen.getByText('Linked')).toBeInTheDocument();
    });

    it('does not call actions when disabled', () => {
        const onSelectLeft = vi.fn();
        const onSelectRight = vi.fn();
        render(
            <MatchingQuestion 
                pairs={pairs} 
                shuffledOptions={shuffledOptions} 
                activeMatchLeft="Hello" 
                matchingAnswers={{}} 
                onSelectLeft={onSelectLeft} 
                onSelectRight={onSelectRight} 
                disabled={true}
            />
        );
        
        fireEvent.click(screen.getByText('Water'));
        fireEvent.click(screen.getByText('ನೀರು'));
        
        expect(onSelectLeft).not.toHaveBeenCalled();
        expect(onSelectRight).not.toHaveBeenCalled();
    });
});
