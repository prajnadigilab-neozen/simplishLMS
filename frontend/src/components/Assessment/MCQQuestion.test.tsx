import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MCQQuestion from './MCQQuestion';

describe('MCQQuestion component', () => {
  const options = ['Option A', 'Option B', 'Option C'];
  
  it('renders all options correctly', () => {
    render(<MCQQuestion options={options} selectedOption={null} onSelect={() => {}} />);
    
    options.forEach(opt => {
      expect(screen.getByText(opt)).toBeInTheDocument();
    });
  });

  it('calls onSelect when an option is clicked', () => {
    const onSelect = vi.fn();
    render(<MCQQuestion options={options} selectedOption={null} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Option A'));
    expect(onSelect).toHaveBeenCalledWith('Option A');
  });

  it('shows selected state correctly', () => {
    const { container } = render(
      <MCQQuestion options={options} selectedOption="Option B" onSelect={() => {}} />
    );
    
    // Check for the selection indicator or background change
    // Using style check as it's defined in the component
    const optionB = screen.getByText('Option B').closest('div');
    expect(optionB).toHaveStyle('background: rgba(99, 102, 241, 0.15)');
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = vi.fn();
    render(<MCQQuestion options={options} selectedOption={null} onSelect={onSelect} disabled={true} />);
    
    fireEvent.click(screen.getByText('Option A'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
