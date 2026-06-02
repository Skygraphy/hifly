import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useGalleryStore } from '../stores/galleryStore';
import { fetchImages, deleteImage, deleteImages, type ImageSummary } from '../api/images';

const LIMIT = 50;

export function useGallery() {
  const { filterTags, filterAddress } = useGalleryStore();
  const queryClient = useQueryClient();

  const queryKey = ['images', { filterTags, filterAddress }];

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 1 }) =>
      fetchImages({ tags: filterTags, address: filterAddress, page: pageParam as number, limit: LIMIT }),
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    initialPageParam: 1,
  });

  const allImages: ImageSummary[] = query.data?.pages.flatMap((p) => p.data) ?? [];
  const total = query.data?.pages[0]?.meta.total ?? 0;

  async function removeSingle(hash: string) {
    await deleteImage(hash);
    queryClient.invalidateQueries({ queryKey });
  }

  async function removeBulk(hashes: string[]) {
    await deleteImages(hashes);
    queryClient.invalidateQueries({ queryKey });
  }

  return {
    images: allImages,
    total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    removeSingle,
    removeBulk,
    refetch: () => queryClient.invalidateQueries({ queryKey }),
  };
}
