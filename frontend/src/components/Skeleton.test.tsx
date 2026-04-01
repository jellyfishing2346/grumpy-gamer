import React from 'react';
import { render } from '@testing-library/react';
import Skeleton from '../Skeleton';

describe('Skeleton', () => {
  test('renders without crashing', () => {
    const { container } = render(<Skeleton />);
    expect(container.innerHTML).toBeTruthy();
  });

  test('applies default width of 100%', () => {
    const { container } = render(<Skeleton />);
    expect(container.innerHTML).toContain('width: 100%');
  });

  test('applies custom width', () => {
    const { container } = render(<Skeleton width="50%" />);
    expect(container.innerHTML).toContain('width: 50%');
  });

  test('applies custom height', () => {
    const { container } = render(<Skeleton height="2em" />);
    expect(container.innerHTML).toContain('height: 2em');
  });

  test('applies animation style', () => {
    const { container } = render(<Skeleton />);
    expect(container.innerHTML).toContain('skeleton-pulse');
  });
});
