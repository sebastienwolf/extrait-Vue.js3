import PatchApiService from "@/core/services/apis/base/PatchApiService";
import { callAPI } from "@/core/services/apis/callApi";

export default class PollAuthApiService extends PatchApiService {
    constructor() {
        super("polls");
        this.domain = "auth";
    }

    async answer(id: number, data = {}) {
        try {
            return callAPI<any>(this.getUrl('polls/' + id + '/answer', false), 'POST', { data })
        } catch (err) {
            this.handleErrors(err);
        }
    }
}