import { useParams } from "react-router";

export function CustomerPage() {
  const { pageId } = useParams();

  return (
    <div className="h-full flex items-center justify-center bg-[#F8F9FA]">
      <div className="text-center">
        <h1 className="text-[1.5rem] text-[#1A1A1A] mb-2">새 고객관리 페이지</h1>
        <p className="text-[#999] text-[0.9rem]">
          페이지 ID: {pageId || "-"}
        </p>
      </div>
    </div>
  );
}
