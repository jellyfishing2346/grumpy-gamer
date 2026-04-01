import React from 'react';
import { render, screen } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
  test('renders without crashing', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  test('applies default width and height', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('1em');
  });

  test('applies custom width and height', () => {
    const { container } = render(<Skeleton width="50%" height="2em" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('50%');
    expect(el.style.height).toBe('2em');
  });

  test('applies custom borderRadius', () => {
    const { container } = render(<Skeleton borderRadius={4} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.borderRadius).toBe('4px');
  });

  test('merges custom style', () => {
    const { container } = render(
      <Skeleton style={{ marginBottom: '1em' }} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.marginBottom).toBe('1em');
  });
});