import type { AnchorHTMLAttributes } from 'react';

/** Internal links become hash links; external links open normally. */
export default function Link({ href, children, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string }) {
  const external = /^(https?:|mailto:)/.test(href);
  return <a href={external ? href : `#${href}`} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>{children}</a>;
}
