
import { api } from "@/lib/axios";

type Params = {
  params: { id: string };
};

const handleApiResponse = async (response: any) => {
    // ... (기존 에러 핸들링 로직) ...
    if (!response.ok) {
        let errorDetail = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail ? JSON.stringify(errorData.detail) : errorDetail;
        } catch (e) {
            // JSON 파싱 실패 시, 상태 코드로 오류 메시지 설정
        }
        throw new Error(errorDetail);
    }
    if (response.status === 204) {
        return;
    }
    return response.json();
};

export const fetchMenuList = async (sParam: any) => {
  const res = await api.get(`/admin/menu`, sParam);
  return await handleApiResponse(res);
}

