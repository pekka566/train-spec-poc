import { Tabs } from "@mantine/core";
import { IconChartBar, IconCalendar, IconTable } from "@tabler/icons-react";

export type TabValue = "summary" | "timeline" | "table";

interface TabNavigationProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <Tabs
      value={activeTab}
      onChange={(value) => onTabChange(value as TabValue)}
    >
      <Tabs.List>
        <Tabs.Tab value="summary" leftSection={<IconChartBar size={16} />}>
          Summary
        </Tabs.Tab>
        <Tabs.Tab value="timeline" leftSection={<IconCalendar size={16} />}>
          Timeline
        </Tabs.Tab>
        <Tabs.Tab value="table" leftSection={<IconTable size={16} />}>
          Table
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
