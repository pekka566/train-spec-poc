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
        <Tabs.Tab
          value="summary"
          id="tab-summary"
          leftSection={<IconChartBar size={16} aria-hidden />}
        >
          Summary
        </Tabs.Tab>
        <Tabs.Tab
          value="timeline"
          id="tab-timeline"
          leftSection={<IconCalendar size={16} aria-hidden />}
        >
          Timeline
        </Tabs.Tab>
        <Tabs.Tab
          value="table"
          id="tab-table"
          leftSection={<IconTable size={16} aria-hidden />}
        >
          Table
        </Tabs.Tab>
      </Tabs.List>
    </Tabs>
  );
}
