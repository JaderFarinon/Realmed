<template>
  <aside :class="[
    'fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-99999 border-r border-gray-200',
    {
      'lg:w-[290px]': isExpanded || isMobileOpen || isHovered,
      'lg:w-[90px]': !isExpanded && !isHovered,
      'translate-x-0 w-[290px]': isMobileOpen,
      '-translate-x-full': !isMobileOpen,
      'lg:translate-x-0': true,
    },
  ]" @mouseenter="!isExpanded && (isHovered = true)" @mouseleave="isHovered = false">
    <div :class="[
      'py-8 flex',
      !isExpanded && !isHovered ? 'lg:justify-center' : 'justify-start',
    ]">
      <router-link to="/">
        <img v-if="isExpanded || isHovered || isMobileOpen" class="dark:hidden" src="/images/logo/logo-icon.svg"
          alt="Logo" width="24" height="24" />
        <img v-if="isExpanded || isHovered || isMobileOpen" class="hidden dark:block" src="/images/logo/logo-icon.svg"
          alt="Logo" width="24" height="24" />
        <img v-else src="/images/logo/logo-icon.svg" alt="Logo" width="24" height="24" />
      </router-link>
      <label v-if="isExpanded || isHovered || isMobileOpen || isExpanded || isHovered || isMobileOpen"
        style="margin-left: 8px;" class="dark:text-white">Grupo NM</label>
    </div>
    <div class="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
      <nav class="mb-6">
        <div class="flex flex-col gap-4">
          <div v-for="(menuGroup, groupIndex) in menuGroups" :key="groupIndex">
            <h2 :class="[
              'mb-4 text-xs uppercase flex leading-[20px] text-gray-400',
              !isExpanded && !isHovered
                ? 'lg:justify-center'
                : 'justify-start',
            ]">
              <template v-if="isExpanded || isHovered || isMobileOpen">
                {{ menuGroup.title }}
              </template>
              <HorizontalDots v-else />
            </h2>
            <ul class="flex flex-col gap-4">
              <li v-for="(item, index) in menuGroup.items" :key="item.name">
                <button v-if="item.subItems" @click="toggleSubmenu(groupIndex, index)" :class="[
                  'menu-item group w-full',
                  {
                    'menu-item-active': isSubmenuOpen(groupIndex, index),
                    'menu-item-inactive': !isSubmenuOpen(groupIndex, index),
                  },
                  !isExpanded && !isHovered
                    ? 'lg:justify-center'
                    : 'lg:justify-start',
                ]">
                  <component
                    :is="item.icon"
                    :class="[
                      'menu-item-icon',
                      isSubmenuOpen(groupIndex, index)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  />
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{ item.name }}</span>
                  <ChevronDownIcon v-if="isExpanded || isHovered || isMobileOpen" :class="[
                    'ml-auto w-5 h-5 transition-transform duration-200 text-gray-500 group-hover:text-gray-700 dark:text-gray-300 dark:group-hover:text-gray-200',
                    {
                      'rotate-180': isSubmenuOpen(groupIndex, index),
                    },
                  ]" />
                </button>
                <router-link v-else-if="item.path" :to="item.path" :class="[
                  'menu-item group',
                  {
                    'menu-item-active': isActive(item.path),
                    'menu-item-inactive': !isActive(item.path),
                  },
                ]">
                  <component
                    :is="item.icon"
                    :class="[
                      'menu-item-icon',
                      isActive(item.path)
                        ? 'menu-item-icon-active'
                        : 'menu-item-icon-inactive',
                    ]"
                  />
                  <span v-if="isExpanded || isHovered || isMobileOpen" class="menu-item-text">{{ item.name }}</span>
                </router-link>
                <transition @enter="startTransition" @after-enter="endTransition" @before-leave="startTransition"
                  @after-leave="endTransition">
                  <div v-show="isSubmenuOpen(groupIndex, index) &&
                    (isExpanded || isHovered || isMobileOpen)
                    ">
                    <ul class="mt-2 space-y-1 ml-9">
                      <li v-for="(subItem, subIndex) in item.subItems" :key="subItem.name">
                        <template v-if="subItem.subItems">
                          <button
                            type="button"
                            @click.stop="toggleChildSubmenu(groupIndex, index, subIndex)"
                            class="menu-dropdown-item w-full text-left group"
                          >
                            <span>{{ subItem.name }}</span>
                            <ChevronDownIcon
                              class="menu-item-arrow ml-auto h-4 w-4 transition-transform duration-200"
                              :class="[
                                isChildSubmenuOpen(groupIndex, index, subIndex, subItem.subItems)
                                  ? 'menu-item-arrow-active'
                                  : 'menu-item-arrow-inactive',
                              ]"
                            />
                          </button>
                          <transition
                            @enter="startTransition"
                            @after-enter="endTransition"
                            @before-leave="startTransition"
                            @after-leave="endTransition"
                          >
                            <ul
                              v-show="isChildSubmenuOpen(groupIndex, index, subIndex, subItem.subItems)"
                              class="mt-2 space-y-1 ml-4"
                            >
                              <li v-for="child in subItem.subItems" :key="child.name">
                                <router-link v-if="child.path" :to="child.path" :class="[
                                  'menu-dropdown-item',
                                  {
                                    'menu-dropdown-item-active': isActive(child.path),
                                    'menu-dropdown-item-inactive': !isActive(child.path),
                                  },
                                ]">
                                  {{ child.name }}
                                </router-link>
                                <span v-else class="menu-dropdown-item cursor-default">
                                  {{ child.name }}
                                </span>
                              </li>
                            </ul>
                          </transition>
                        </template>
                        <router-link v-else-if="subItem.path" :to="subItem.path" :class="[
                          'menu-dropdown-item',
                          {
                            'menu-dropdown-item-active': isActive(subItem.path),
                            'menu-dropdown-item-inactive': !isActive(subItem.path),
                          },
                        ]">
                          {{ subItem.name }}
                        </router-link>
                        <span v-else class="menu-dropdown-item cursor-default">
                          {{ subItem.name }}
                        </span>
                      </li>
                    </ul>
                  </div>
                </transition>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";

import { hiddenPermissionModules } from "@/constants/hiddenPermissionModules";
import { ChevronDownIcon, HorizontalDots, sidebarMenuGroups } from "@/constants/sidebarMenu";
import type { SidebarMenuGroup, SidebarMenuItem } from "@/constants/sidebarMenu";
import { useSidebar } from "@/composables/useSidebar";
import { useAuthUser } from "@/composables/useAuthUser";
import {
  buildPermissionModuleGroups,
  flattenPermissionModules,
  keyFromPath,
} from "@/utils/permission-modules";

const route = useRoute();

const { isExpanded, isMobileOpen, isHovered, openSubmenu } = useSidebar();

const openChildSubmenus = ref<Set<string>>(new Set());

const authStore = useAuthUser();

const permissionModuleGroups = buildPermissionModuleGroups(
  sidebarMenuGroups,
  hiddenPermissionModules,
);
const permissionModules = flattenPermissionModules(permissionModuleGroups);
const GUARDED_PERMISSION_KEYS = new Set<string>();

permissionModules.forEach((module) => {
  if (module?.key) {
    GUARDED_PERMISSION_KEYS.add(module.key.toLowerCase());
  }
});

const BYPASS_PERMISSION_ROLES = new Set<string>(['masteradmin', 'admin']);

onMounted(() => {
  if (!authStore.isLoaded.value && !authStore.isLoading.value) {
    authStore.loadUser().catch((error) => {
      console.error('Falha ao carregar usuário autenticado', error);
    });
  }
});

const cloneMenuItem = (
  item: SidebarMenuItem,
  subItems?: SidebarMenuItem[],
): SidebarMenuItem => {
  const { subItems: _ignored, ...rest } = item;
  void _ignored;

  const cloned: SidebarMenuItem = { ...rest };

  if (subItems && subItems.length) {
    cloned.subItems = subItems;
  }

  return cloned;
};

const cloneMenuItems = (items: SidebarMenuItem[]): SidebarMenuItem[] =>
  items.map((item) =>
    cloneMenuItem(item, item.subItems ? cloneMenuItems(item.subItems) : undefined),
  );

const hasMenuPermission = (path?: string): boolean => {
  if (!path) {
    return true;
  }

  const normalizedRole = authStore.role.value?.toLowerCase() ?? '';

  if (BYPASS_PERMISSION_ROLES.has(normalizedRole)) {
    return true;
  }

  const moduleKey = keyFromPath(path);
  const normalizedKey = moduleKey.toLowerCase();

  if (!GUARDED_PERMISSION_KEYS.has(normalizedKey)) {
    return true;
  }

  return authStore.hasModulePermission(normalizedKey, 'view');
};

const filterItemsByPermission = (items: SidebarMenuItem[]): SidebarMenuItem[] => {
  const result: SidebarMenuItem[] = [];

  for (const item of items) {
    if (item.subItems && item.subItems.length) {
      const filteredSubItems = filterItemsByPermission(item.subItems);

      if (filteredSubItems.length > 0) {
        result.push(cloneMenuItem(item, filteredSubItems));
      }

      continue;
    }

    if (hasMenuPermission(item.path)) {
      result.push(cloneMenuItem(item));
    }
  }

  return result;
};

const filterSidebarMenuGroups = (groups: SidebarMenuGroup[]): SidebarMenuGroup[] =>
  groups
    .map((group) => {
      const items = filterItemsByPermission(group.items);

      if (!items.length) {
        return null;
      }

      return { ...group, items };
    })
    .filter((group): group is SidebarMenuGroup => group !== null);

const menuGroups = computed<SidebarMenuGroup[]>(() =>
  filterSidebarMenuGroups(sidebarMenuGroups),
);

const isActive = (path: string) => route.path === path;

const hasActiveSubItem = (subItems: SidebarMenuItem[]) =>
  subItems.some((subItem) =>
    subItem.path ? isActive(subItem.path) : hasActiveSubItem(subItem.subItems || [])
  );

const getChildSubmenuKey = (
  groupIndex: number,
  itemIndex: number,
  subIndex: number,
) => `${groupIndex}-${itemIndex}-${subIndex}`;

const toggleSubmenu = (groupIndex: number, itemIndex: number) => {
  const key = `${groupIndex}-${itemIndex}`;
  openSubmenu.value = openSubmenu.value === key ? null : key;
};

const toggleChildSubmenu = (
  groupIndex: number,
  itemIndex: number,
  subIndex: number,
) => {
  const key = getChildSubmenuKey(groupIndex, itemIndex, subIndex);
  const updated = new Set(openChildSubmenus.value);

  if (updated.has(key)) {
    updated.delete(key);
  } else {
    updated.add(key);
  }

  openChildSubmenus.value = updated;
};

const isAnySubmenuRouteActive = computed(() => {
  return menuGroups.value.some((group) =>
    group.items.some(
      (item) => Array.isArray(item.subItems) && hasActiveSubItem(item.subItems)
    )
  );
});

const isSubmenuOpen = (groupIndex: number, itemIndex: number) => {
  const key = `${groupIndex}-${itemIndex}`;
  const group = menuGroups.value[groupIndex];
  const item = group?.items?.[itemIndex];
  const subItems = Array.isArray(item?.subItems) ? item.subItems : [];
  return (
    openSubmenu.value === key ||
    (isAnySubmenuRouteActive.value && hasActiveSubItem(subItems))
  );
};

const isChildSubmenuOpen = (
  groupIndex: number,
  itemIndex: number,
  subIndex: number,
  subItems: SidebarMenuItem[] = [],
) => {
  const key = getChildSubmenuKey(groupIndex, itemIndex, subIndex);
  return openChildSubmenus.value.has(key) || hasActiveSubItem(subItems);
};

const startTransition = (el: Element) => {
  const element = el as HTMLElement;
  element.style.height = "auto";
  const height = element.scrollHeight;
  element.style.height = "0px";
  void element.offsetHeight; // force reflow
  element.style.height = height + "px";
};

const endTransition = (el: Element) => {
  const element = el as HTMLElement;
  element.style.height = "";
};
</script>
