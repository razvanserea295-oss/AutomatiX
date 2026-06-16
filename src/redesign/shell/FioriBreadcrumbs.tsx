import { Breadcrumbs, BreadcrumbsItem } from '@ui5/webcomponents-react';

// Reuses the SaaS "Automatix / {page}" breadcrumb as an authentic Fiori
// Breadcrumbs control, placed in the DynamicPageTitle `breadcrumbs` slot.
// The last item is the current page (rendered as plain text by Fiori).
export default function FioriBreadcrumbs({ page }: { page: string }) {
  return (
    <Breadcrumbs>
      <BreadcrumbsItem>Automatix</BreadcrumbsItem>
      <BreadcrumbsItem>{page}</BreadcrumbsItem>
    </Breadcrumbs>
  );
}
