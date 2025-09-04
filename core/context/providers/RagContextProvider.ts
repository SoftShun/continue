import {
  ContextItem,
  ContextProviderDescription,
  ContextProviderExtras,
  ContextSubmenuItem,
  LoadSubmenuItemsArgs,
} from "../../index.js";
import { BaseContextProvider } from "../index.js";
import { retrieveContextItemsFromEmbeddings } from "../retrieval/retrieval.js";

class RagContextProvider extends BaseContextProvider {
  static description: ContextProviderDescription = {
    title: "rag",
    displayTitle: "RAG 검색",
    description:
      "RAG 임베딩을 사용하여 코드베이스에서 관련 컨텍스트를 검색합니다",
    type: "submenu",
    renderInlineAs: "📚",
  };

  async getContextItems(
    query: string,
    extras: ContextProviderExtras,
  ): Promise<ContextItem[]> {
    // query는 실제로는 submenu에서 선택된 그룹명이 됩니다
    const groupName = query;

    // RAG 검색 수행
    try {
      const results = await retrieveContextItemsFromEmbeddings(
        extras,
        {
          nRetrieve: this.options?.nRetrieve ?? 15,
          nFinal: this.options?.nFinal ?? 10,
          useReranking: this.options?.useReranking ?? true,
        },
        undefined, // filterDirectory - 특정 디렉토리 필터링 없음
      );

      if (results.length === 0) {
        return [
          {
            description: `RAG 검색 결과 (그룹: ${groupName})`,
            content: `"${groupName}" 그룹에 대한 RAG 검색 결과를 찾을 수 없습니다.`,
            name: `RAG: ${groupName}`,
          },
        ];
      }

      // 결과를 그룹명과 함께 반환
      return results.map((item, index) => ({
        ...item,
        name: `RAG: ${groupName} (${index + 1})`,
        description: `RAG 검색 결과 - ${groupName}: ${item.description}`,
      }));
    } catch (error) {
      console.error("RAG 검색 중 오류 발생:", error);
      return [
        {
          description: `RAG 검색 오류 (그룹: ${groupName})`,
          content: `"${groupName}" 그룹에 대한 RAG 검색 중 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
          name: `RAG 오류: ${groupName}`,
        },
      ];
    }
  }

  async loadSubmenuItems(
    args: LoadSubmenuItemsArgs,
  ): Promise<ContextSubmenuItem[]> {
    try {
      // Backend API에서 group name 목록 가져오기
      const groups = await this.fetchGroupNamesFromAPI();

      return groups.map((groupName: string) => ({
        id: groupName,
        title: `${groupName}`,
        description: `${groupName}와 관련된 코드베이스 컨텍스트를 검색합니다`,
      }));
    } catch (error) {
      console.error("그룹 목록 로드 중 오류:", error);

      // Fallback: 기본 그룹 목록 사용
      const defaultGroups = this.options?.groups || [
        "authentication",
        "database",
        "api",
        "ui-components",
        "tests",
        "utils",
        "models",
        "services",
        "controllers",
        "middleware",
      ];

      return defaultGroups.map((groupName: string) => ({
        id: groupName,
        title: `${groupName}(기본값)`,
        description: `${groupName}와 관련된 코드베이스 컨텍스트를 검색합니다 (API 연결 실패로 기본값 사용)`,
      }));
    }
  }

  private async fetchGroupNamesFromAPI(): Promise<string[]> {
    try {
      // 설정에서 API URL 가져오기 (기본값: localhost:8001)
      const apiBaseUrl = this.options?.apiBaseUrl || "http://localhost:8001";
      const apiUrl = `${apiBaseUrl}/api/v1/groups`;

      console.log(`RAG 그룹 목록 API 호출: ${apiUrl}`);

      // Backend API 호출
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // 5초 타임아웃 설정
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(
          `API 호출 실패: ${response.status} ${response.statusText}`,
        );
      }

      const groups: string[] = await response.json();

      if (!Array.isArray(groups)) {
        throw new Error("API 응답이 배열 형태가 아닙니다");
      }

      console.log(`RAG 그룹 목록 로드 성공: ${groups.length}개 그룹`, groups);
      return groups;
    } catch (error) {
      console.error("Backend API 호출 오류:", error);
      throw error;
    }
  }
}

export default RagContextProvider;
