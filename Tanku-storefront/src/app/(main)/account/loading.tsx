import Spinner from "@modules/common/icons/spinner"

export default function Loading() {
  return (
    <div className="flex items-center justify-center w-full h-full text-ui-fg-base bg-[#1E1E1E]">
      <Spinner size={36} />
    </div>
  )
}
