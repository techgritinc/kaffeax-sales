import Image from 'next/image';

import { Avatar } from '@/components/ui/avatar';
import { APP_LABEL, USER_EMAIL, USER_INITIALS, USER_NAME } from '@/constants/workflow';

/** Fixed 56px top bar: logo + app label on the left, user identity on the right. */
export function AppHeader() {
  return (
    <header className="border-border-strong shadow-header max-bp900:px-[16px] max-bp560:gap-2 max-bp560:px-[12px] flex h-[56px] items-center justify-between gap-3 border-b bg-white px-[32px]">
      <div className="max-bp560:gap-2 flex min-w-0 flex-1 items-center gap-[14px]">
        <Image
          src="/images/KX-Primary-logo.png"
          alt="Kaffea-X"
          width={144}
          height={34}
          priority
          className="max-bp900:hidden block h-[34px] w-auto shrink-0"
        />
        <Image
          src="/icons/favicon.png"
          alt="Kaffea-X"
          width={32}
          height={32}
          className="rounded-btn max-bp900:block hidden h-8 w-8 shrink-0 object-cover"
        />
        <span className="bg-border-strong max-bp900:h-[22px] max-bp400:hidden h-[26px] w-px shrink-0" />
        <span className="text-midnight max-bp900:text-[12.5px] max-bp560:text-[11.5px] max-bp400:text-[11px] min-w-0 truncate font-sans text-[13px] font-medium">
          {APP_LABEL}
        </span>
      </div>
      <div className="max-bp560:gap-2 flex shrink-0 items-center gap-3">
        <div className="max-bp560:hidden min-w-0 text-right">
          <div className="text-midnight max-bp900:max-w-[140px] max-w-[180px] truncate text-[13px] leading-[1.2] font-bold">
            {USER_NAME}
          </div>
          <div className="text-muted max-bp900:max-w-[140px] max-w-[180px] truncate text-[11px] leading-[1.2]">
            {USER_EMAIL}
          </div>
        </div>
        <Avatar
          variant="initials"
          initials={USER_INITIALS}
          tone="green"
          size={36}
          className="max-bp560:h-8 max-bp560:w-8 max-bp560:text-[12px]"
        />
      </div>
    </header>
  );
}
