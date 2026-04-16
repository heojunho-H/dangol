import { useEffect } from "react";
import { useNavigate } from "react-router";
import { usePages, useCreatePage, type PageScope } from "../hooks/use-pages";

interface Props {
  scope: PageScope;
  basePath: string;
  defaultName: string;
}

export function PageRedirect({ scope, basePath, defaultName }: Props) {
  const navigate = useNavigate();
  const { data: pages, isLoading } = usePages(scope);
  const createPageMut = useCreatePage();

  useEffect(() => {
    if (isLoading || !pages) return;
    if (pages.length > 0) {
      navigate(`${basePath}/${pages[0].id}`, { replace: true });
      return;
    }
    if (createPageMut.isPending || createPageMut.isSuccess) return;
    createPageMut.mutate(
      { scope, name: defaultName, sort_order: 0 },
      {
        onSuccess: (page) => navigate(`${basePath}/${page.id}`, { replace: true }),
      }
    );
  }, [isLoading, pages, basePath, defaultName, scope, navigate, createPageMut]);

  return (
    <div className="flex items-center justify-center h-full text-[0.85rem] text-[#999]">
      페이지를 불러오는 중…
    </div>
  );
}
