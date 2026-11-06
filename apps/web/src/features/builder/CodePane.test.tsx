import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CodePane, buildTree } from './CodePane';

const files = [
  { path: 'index.html', content: '<div id="root"></div>' },
  { path: 'package.json', content: '{}' },
  { path: 'src/App.tsx', content: 'export function App() { return null; }' },
  { path: 'src/components/Hero.tsx', content: 'export const Hero = () => null;' },
];

describe('CodePane', () => {
  it('nests files into folders', () => {
    const tree = buildTree(files);
    expect(tree.files.map((f) => f.path)).toEqual(['index.html', 'package.json']);
    expect(tree.folders[0]!.name).toBe('src');
    expect(tree.folders[0]!.folders[0]!.files[0]!.path).toBe('src/components/Hero.tsx');
  });

  it('shows a folder tree and opens files from it', async () => {
    render(<CodePane files={files} turn={null} />);
    const nav = screen.getByRole('navigation', { name: 'Files' });
    expect(nav).toHaveTextContent('components');
    await userEvent.click(screen.getByRole('button', { name: 'Hero.tsx' }));
    expect(screen.getByRole('button', { name: 'Hero.tsx' })).toHaveAttribute(
      'aria-current',
      'true',
    );
    expect(screen.getByText('Hero')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'components' }));
    expect(screen.queryByRole('button', { name: 'Hero.tsx' })).not.toBeInTheDocument();
  });
});
