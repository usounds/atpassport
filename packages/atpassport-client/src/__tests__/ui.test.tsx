import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { AtPassportUI, AtPassportIcon } from '../ui';
import '@testing-library/jest-dom';

describe('AtPassportUI', () => {
  it('contains expected language keys', () => {
    expect(AtPassportUI.ja).toBeDefined();
    expect(AtPassportUI.en).toBeDefined();
    expect(AtPassportUI.ja.title).toBeDefined();
    expect(AtPassportUI.ja.add).toBeDefined();
  });

  it('contains icon definitions', () => {
    expect(AtPassportUI.iconSvg).toContain('<svg');
    expect(AtPassportUI.getIconSvg(256)).toContain('width="256"');
  });
});

describe('AtPassportIcon', () => {
  it('renders without crashing', () => {
    const { container } = render(<AtPassportIcon size={48} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '48');
  });

  it('renders with default size', () => {
    const { container } = render(<AtPassportIcon />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
  });
});
