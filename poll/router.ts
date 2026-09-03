
const BasicLayout = () => import("@/core/views/layouts/BasicLayout.vue");

const CreatePoll = () => import("./view/PollCreate.vue");
const PollDetailsOrNotFound = () => import("./view/PollDetailsOrNotFound.vue");
const UpdateAdd = () => import("@/core/views/ad/Edit.vue");
const DeletePage = () => import("@/core/views/ad/delete/DeleteAd.vue");
const ViewTechnical404 = () => import("@/core/views/technical/404.vue");

export default {
    routes: [
        {
            path: "/create",
            component: BasicLayout,
            children: [
                {
                    path: "poll",
                    children: [
                        {
                            path: "",
                            name: "poll-create-step-1",
                            component: CreatePoll,
                            meta: {
                                activeNav: "",
                                requiresAuth: true,
                                checkAdminOrGroup: true,
                                doNotGoBack: true,
                            },
                            props: route => ({
                                idGroup: route.query.idGroup
                                    ? Number(route.query.idGroup)
                                    : null,
                            }),
                        },
                    ],
                },
            ],
        },

        {
            path: "/polls",
            component: BasicLayout,
            children: [
                {
                    path: ":id",
                    children: [
                        {
                            path: "",
                            name: "poll-details",
                            component: PollDetailsOrNotFound,
                            meta: {
                                activeNav: 'poll',
                                beforeEnter: 'polls',
                                checkAdminOrGroup: true,
                            },
                            props: route => ({ resource: route.params.resource })
                        },
                        {
                            path: "edit",
                            name: "poll-edit",
                            component: UpdateAdd,
                            props: route => ({ id: Number(route.params.id), query: route.query }),
                            meta: {
                                requiresAuth: true,
                                activeNav: 'poll'
                            }
                        },
                        {
                            path: "delete",
                            name: "poll-delete",
                            component: DeletePage,
                            props: route => ({ id: Number(route.params.id) }),
                            meta: {
                                activeNav: 'poll',
                                requiresAuth: true,
                                type: "polls"
                            }
                        },
                    ]
                },
            ]
        },
    ],
    guards: [
        /* If not present in core declare requiresAuth & requiresPublishPermission guards */
    ],
};
