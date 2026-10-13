"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SearchContextType = {
  search: string;
  setSearch: (term: string) => void;
  clearSearch: () => void;
};

const SearchContext = createContext<SearchContextType>({
  search: "",
  setSearch: () => {},
  clearSearch: () => {},
});

export function SearchProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");

  return (
    <SearchContext.Provider
      value={{
        search,
        setSearch,
        clearSearch: () => setSearch(""),
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
