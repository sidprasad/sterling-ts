import { Center, CenterProps, useStyleConfig } from '@chakra-ui/react';

const Logo = (props: CenterProps) => {
  const styles = useStyleConfig('Logo');
  return (
    <Center __css={styles} {...props}>
      Spytial Sterling
    </Center>
  );
};

const LogoTheme = {
  baseStyle: {
    px: 3,
    py: 2,
    fontWeight: 'extrabold',
    fontSize: 'md',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'white',
    bg: 'whiteAlpha.100',
    borderRadius: 'lg',
    boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.12)',
    lineHeight: '1'
  }
};

export { Logo, LogoTheme };
