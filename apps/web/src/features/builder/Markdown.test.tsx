import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders lists, bold and code', () => {
    const { container } = render(
      <Markdown text={'Hello **there**\n\n- one\n- `two`\n\n1. first'} />,
    );
    expect(screen.getByText('there').tagName).toBe('STRONG');
    expect(container.querySelectorAll('ul li')).toHaveLength(2);
    expect(screen.getByText('two').tagName).toBe('CODE');
    expect(container.querySelector('ol li')).toHaveTextContent('first');
  });

  it('never renders HTML from the text', () => {
    const { container } = render(<Markdown text={'<img src=x onerror=alert(1)> **ok**'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('<img src=x onerror=alert(1)>');
  });
});
