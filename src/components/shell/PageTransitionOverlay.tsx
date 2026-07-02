interface Props {
  routeKey: string;
}

/** Route-change overlay disabled — no animated refresh veil between pages. */
export default function PageTransitionOverlay(_props: Props) {
  return null;
}
