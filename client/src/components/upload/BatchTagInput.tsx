import { useQuery } from '@tanstack/react-query';
import { TagInput } from '../common/TagInput';
import { useUploadStore } from '../../stores/uploadStore';
import { fetchTags } from '../../api/tags';

export function BatchTagInput() {
  const { batchTags, setBatchTags } = useUploadStore();
  const { data: tagData } = useQuery({ queryKey: ['tags'], queryFn: fetchTags, staleTime: 60000 });
  const suggestions = tagData?.map((t) => t.tag) ?? [];

  return (
    <div>
      <label className="text-sm font-medium text-base-content/70 mb-2 block">
        Tags für alle Bilder
        <span className="ml-2 text-xs text-base-content/40">
          (werden mit individuellen Tags zusammengeführt)
        </span>
      </label>
      <TagInput
        tags={batchTags}
        onChange={setBatchTags}
        placeholder="Tags für alle hinzufügen…"
        suggestions={suggestions}
      />
    </div>
  );
}
