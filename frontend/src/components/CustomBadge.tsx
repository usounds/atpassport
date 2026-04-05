'use client';

import { Box, BoxProps, rem } from '@mantine/core';

interface CustomBadgeProps extends BoxProps {
  children: React.ReactNode;
  color?: string;
  variant?: 'light' | 'filled' | 'dot';
}

export function CustomBadge({ children, color = 'blue', variant = 'light', style, ...others }: CustomBadgeProps) {
  const getColors = () => {
    if (variant === 'filled') {
      return {
        backgroundColor: `var(--mantine-color-${color}-filled)`,
        color: 'var(--mantine-color-white)',
      };
    }
    if (variant === 'dot') {
       return {
         backgroundColor: 'transparent',
         color: 'var(--mantine-color-text)',
         border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
         paddingLeft: rem(24), // Space for the dot
         position: 'relative' as const,
       };
    }
    // light variant (default)
    return {
      backgroundColor: `var(--mantine-color-${color}-light)`,
      color: `var(--mantine-color-${color}-light-color)`,
    };
  };

  const { backgroundColor, color: textColor, border, paddingLeft, position } = getColors();

  return (
    <Box
      component="span"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${rem(3)} ${rem(10)}`,
        borderRadius: rem(100),
        fontSize: rem(12),
        fontWeight: 700,
        backgroundColor,
        color: textColor,
        border,
        paddingLeft: paddingLeft || rem(10),
        position,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        ...style,
      }}
      {...others}
    >
      {variant === 'dot' && (
        <Box
          component="span"
          style={{
            position: 'absolute',
            left: rem(10),
            width: rem(8),
            height: rem(8),
            borderRadius: '50%',
            backgroundColor: `var(--mantine-color-${color}-filled)`,
          }}
        />
      )}
      {children}
    </Box>
  );
}
