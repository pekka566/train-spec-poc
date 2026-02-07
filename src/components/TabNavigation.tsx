import { Tabs } from "@mantine/core";
import { IconChartBar, IconTable } from "@tabler/icons-react";

export type TabValue = "summary" | "table";

interface TabNavigationProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

export const TABS_ID = "main-tabs";

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <Tabs
      id={TABS_ID}
      value={activeTab}
      onChange={(value) => onTabChange(value as TabValue)}
    >
      <Tabs.List>
        <Tabs.Tab
          value="summary"
          leftSection={<IconChartBar size={16} aria-hidden />}
        >
          Summary
        </Tabs.Tab>
        <Tabs.Tab
          value="table"
          leftSection={<IconTable size={16} aria-hidden />}
        >
          Table
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
