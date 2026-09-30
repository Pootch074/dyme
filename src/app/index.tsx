import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

export default function Index() {
  const [titles, setTitles] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("todos")
      .select()
      .then(({ data, error }) => {
        if (error) {
          setTitles([error.message]);
          return;
        }
        setTitles(data.map((todo) => todo.title));
      });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {titles.map((title) => (
        <Text key={title}>{title}</Text>
      ))}
    </View>
  );
}
