import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Body, Quote, Strong, Title } from '@/components/ui/typography';

export default function MessageScreen() {
  return (
    <Screen showBack>
      <Title className="mt-6">Why Skip is different</Title>

      <View className="mt-8 w-full gap-4">
        <Body>
          Skip is built for people who want to truly understand their money—not simply automate it
          and forget about it.
        </Body>
        <Body>
          While many budgeting apps automatically import and categorize everything, Skip takes a
          more intentional approach. Recording your spending helps you notice where your money goes,
          understand your habits, and appreciate what you save.
        </Body>
        <Body>
          Our team spent months designing Skip this way. It is not missing automatic budgeting—it is
          intentionally built around awareness, privacy, and control.
        </Body>
      </View>

      <Quote className="mt-8 w-full">
        “People once recorded every penny in a ledger. Skip brings that same financial awareness
        into modern life—without the paperwork.”
      </Quote>

      <Body className="mt-8 w-full">
        <Strong>Skip Budget</Strong>: Know where your money goes. Decide where it goes next.
      </Body>

      <View className="mt-auto w-full pt-10">
        <Button label="Lets go" onPress={() => router.push('/auth')} />
      </View>
    </Screen>
  );
}
