import { create } from "zustand";

import { listAssets, uploadAsset } from "@/lib/api";
import { Asset } from "@/lib/types";

type AssetState = {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  fetchAssets: () => Promise<void>;
  upload: (file: File) => Promise<void>;
};

export const useAssetStore = create<AssetState>((set) => ({
  assets: [],
  loading: false,
  error: null,

  fetchAssets: async () => {
    set({ loading: true, error: null });
    try {
      const assets = await listAssets();
      set({ assets, loading: false });
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  },

  upload: async (file) => {
    set({ loading: true, error: null });
    try {
      const asset = await uploadAsset(file);
      set((state) => ({ assets: [asset, ...state.assets], loading: false }));
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  }
}));

