import { shallowMount } from "@vue/test-utils";
import BroadcardHeaderElement from "@/core/component/broadcardHeader/BroadcardHeaderElement.vue";

const defaultProps = {
  id: 1,
  title: "Broadcast title",
  linkName: "En savoir plus",
};

const mountComponent = (props = {}) =>
  shallowMount(BroadcardHeaderElement, {
    props: {
      ...defaultProps,
      ...props,
    },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
    },
  });

describe("BroadcardHeaderElement", () => {
  test("keeps broadcast details link by default", () => {
    const wrapper = mountComponent();

    expect(wrapper.findComponent({ name: "ShowAdsButtons" }).exists()).toBe(
      true,
    );
    expect(wrapper.find('a[target="_blank"]').exists()).toBe(false);
  });

  test("uses broadcast external link when skip_broadcast_show_page is true", () => {
    const wrapper = mountComponent({
      skipBroadcastShowPage: true,
      linkName: "Voir le site",
      linkUrl: "https://pokheimon.fr",
    });

    const externalLink = wrapper.find('a[target="_blank"]');
    expect(externalLink.exists()).toBe(true);
    expect(externalLink.attributes("href")).toBe("https://pokheimon.fr/");
    expect(externalLink.text()).toBe("Voir le site");
    expect(wrapper.findComponent({ name: "ShowAdsButtons" }).exists()).toBe(
      false,
    );
  });

  test("falls back to broadcast details link when external URL is unsafe", () => {
    const wrapper = mountComponent({
      skipBroadcastShowPage: true,
      linkUrl: "javascript:alert(1)",
    });

    expect(wrapper.find('a[target="_blank"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: "ShowAdsButtons" }).exists()).toBe(
      true,
    );
  });
});
